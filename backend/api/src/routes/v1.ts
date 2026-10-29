import { SCAM_TYPES, bandLabel, type Verdict } from "@sachet/core";
import type { Store } from "@sachet/db";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Cache } from "../cache.js";
import { hashUser } from "../hash.js";
import { networkOf } from "../security.js";
import type { Checker, Ctx } from "../services/checker.js";

// Per-IP limits, on top of the per-person report limit in the checker.
const CHECKS_PER_MINUTE = 60;
const REPORTS_PER_IP_HOUR = 30;
const OTHER_WRITES_PER_MINUTE = 20;

// The web app makes one with crypto.randomUUID(). Anything short or odd is
// ignored, so "x" or "" can't become an identity shared by many people.
const clientIdFormat = /^[A-Za-z0-9_-]{16,100}$/;

const checkQuery = z.object({
  type: z.enum(["phone", "upi", "url"]),
  value: z.string().trim().min(1).max(500),
});
const messageBody = z.object({
  text: z.string().trim().min(1).max(4000),
  lang: z.enum(["en", "hi"]).optional(),
  // What the phone shows as the SMS sender: "VM-HDFCBK-S" or a number.
  sender: z.string().trim().max(40).optional(),
});
const reportBody = z
  .object({
    identifiers: z
      .array(z.object({ type: z.enum(["phone", "upi", "url"]), value: z.string().min(1).max(500) }))
      .max(10)
      .optional(),
    text: z.string().max(4000).optional(),
    scamType: z.enum(SCAM_TYPES).optional(),
    amountInr: z.number().int().min(0).max(1_000_000_000).optional(),
  })
  .refine((b) => b.identifiers?.length || b.text?.trim(), {
    message: "Send identifiers or text",
  });
const paidBody = z.object({ paid: z.enum(["yes", "no"]) });
// Clients make one up (a UUID) per report; retries reuse it.
const idempotencyKey = z.string().min(8).max(200);

function toJson(v: Verdict) {
  return {
    band: v.band,
    label: { en: bandLabel(v.band, "en"), hi: bandLabel(v.band, "hi") },
    scamType: v.scamType,
    reasons: v.reasons,
    advice: v.advice,
    reportCount: v.reportCount,
  };
}

function badRequest(reply: FastifyReply, error: z.ZodError | string) {
  const reason = typeof error === "string" ? error : error.issues.map((i) => i.message).join("; ");
  return reply.code(400).send({ error: "bad_request", reason });
}

export function v1Routes(
  app: FastifyInstance,
  deps: { checker: Checker; cache: Cache; store: Store; salt: string },
) {
  const { checker, cache, store, salt } = deps;

  const clientIdOf = (req: FastifyRequest): string | null => {
    const v = req.headers["x-client-id"];
    return typeof v === "string" && clientIdFormat.test(v) ? v : null;
  };

  // Web users are anonymous. The browser keeps a random ID (X-Client-Id) so
  // their reports count once; without it we fall back to the IP address.
  // The client picks that ID, so one person can send many: `network` (a hash
  // of the IP, never the IP itself) makes reports from one network count once.
  const webCtx = (req: FastifyRequest): Ctx => ({
    channel: "web",
    userHash: hashUser(salt, "web", clientIdOf(req) ?? `ip:${req.ip}`),
    network: hashUser(salt, "net", networkOf(req.ip)),
  });

  // Fixed-window limit per IP address.
  const limit =
    (name: string, max: number, windowSeconds: number, reason: string) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const window = Math.floor(Date.now() / (windowSeconds * 1000));
      const n = await cache.incr(`rl:${name}:${networkOf(req.ip)}:${window}`, windowSeconds);
      if (n > max) return reply.code(429).send({ error: "rate_limited", reason });
    };
  const limitChecks = limit("check", CHECKS_PER_MINUTE, 60, "Too many checks. Wait a minute.");
  const limitReports = limit(
    "report-ip",
    REPORTS_PER_IP_HOUR,
    3600,
    "Too many reports from this network. Try again in an hour.",
  );
  const limitWrites = limit(
    "write",
    OTHER_WRITES_PER_MINUTE,
    60,
    "Too many requests. Wait a minute.",
  );

  app.get("/v1/check", { preHandler: limitChecks }, async (req, reply) => {
    const q = checkQuery.safeParse(req.query);
    if (!q.success) return badRequest(reply, q.error);
    const r = await checker.checkIdentifier(q.data.type, q.data.value, webCtx(req));
    if (!r.ok)
      return badRequest(reply, `Could not read "${q.data.value}" as a ${q.data.type}: ${r.reason}`);
    return {
      identifier: { kind: r.kind, value: r.value },
      ...toJson(r.verdict),
      checkId: r.checkId,
    };
  });

  app.post("/v1/check/message", { preHandler: limitChecks }, async (req, reply) => {
    const b = messageBody.safeParse(req.body);
    if (!b.success) return badRequest(reply, b.error);
    const r = await checker.checkMessage(b.data.text, webCtx(req), b.data.sender);
    const e = r.analysis.extracted;
    const s = r.verdict.sender;
    return {
      ...toJson(r.verdict),
      sender: s ? { kind: s.kind, value: s.value, label: s.label, note: s.note } : null,
      signals: r.analysis.signals,
      extracted: {
        phones: e.phones,
        upis: e.upis,
        domains: e.links.map((l) => l.domain),
        amounts: e.amounts,
      },
      checkId: r.checkId,
    };
  });

  app.post("/v1/reports", { preHandler: limitReports }, async (req, reply) => {
    const key = idempotencyKey.safeParse(req.headers["idempotency-key"]);
    if (!key.success)
      return badRequest(reply, "Idempotency-Key header is required (8-200 characters)");
    const b = reportBody.safeParse(req.body);
    if (!b.success) return badRequest(reply, b.error);

    // Scoped to this browser, so nobody can use up someone else's key.
    const ctx = webCtx(req);
    const r = await checker.report(
      { ...b.data, idempotencyKey: `web:${ctx.userHash}:${key.data}` },
      ctx,
    );
    if (!r.ok) return reply.code(r.error === "rate_limited" ? 429 : 400).send(r);
    // 202 Accepted: the report is stored, but it only changes verdicts once
    // enough different people report the same thing.
    return reply.code(202).send({ reportId: r.reportId, duplicate: r.duplicate });
  });

  // Answer to "Did you pay?" from the web result page. Only the browser that
  // made the check can answer, so nobody can inflate "money protected".
  // The answer is 204 either way, so it doesn't reveal which check IDs exist.
  app.post<{ Params: { id: string } }>(
    "/v1/checks/:id/paid",
    { preHandler: limitWrites },
    async (req, reply) => {
      const b = paidBody.safeParse(req.body);
      if (!b.success || !z.string().uuid().safeParse(req.params.id).success) {
        return badRequest(reply, 'Send {"paid": "yes" | "no"} for a valid check id');
      }
      await store.setUserPaid(req.params.id, webCtx(req).userHash, b.data.paid);
      return reply.code(204).send();
    },
  );

  app.get("/v1/stats", async () => store.stats());

  // "Delete my data" for the web: removes everything tied to this browser's ID.
  // It needs that ID: falling back to the IP would let anyone on the same
  // network (a hostel, an office, a mobile carrier) delete each other's data.
  app.delete("/v1/me", { preHandler: limitWrites }, async (req, reply) => {
    const clientId = clientIdOf(req);
    if (!clientId) return badRequest(reply, "X-Client-Id header is required");
    return store.deleteUserData(hashUser(salt, "web", clientId));
  });
}
