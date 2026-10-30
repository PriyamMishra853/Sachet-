import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Cache } from "../cache.js";
import { networkOf, safeEqual } from "../security.js";
import type { Appeals } from "../services/appeals.js";
import { badRequest } from "./v1.js";

// Operator routes, only registered when ADMIN_TOKEN is set. Every request
// carries "Authorization: Bearer <ADMIN_TOKEN>". After 10 wrong tokens from
// one network in an hour, that network is refused for the rest of the hour,
// even with the right token, so the token can't be guessed by trying.
const WRONG_TOKENS_PER_HOUR = 10;

const listQuery = z.object({
  status: z.enum(["open", "upheld", "rejected"]).default("open"),
});
const decisionBody = z.object({
  decision: z.enum(["upheld", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export function adminRoutes(
  app: FastifyInstance,
  deps: { appeals: Appeals; cache: Cache; token: string },
) {
  const { appeals, cache, token } = deps;

  const auth = async (req: FastifyRequest, reply: FastifyReply) => {
    const window = Math.floor(Date.now() / 3_600_000);
    const failKey = `rl:adminfail:${networkOf(req.ip)}:${window}`;
    const fails = Number((await cache.get(failKey).catch(() => null)) ?? 0);
    if (fails >= WRONG_TOKENS_PER_HOUR) {
      return reply
        .code(429)
        .send({ error: "rate_limited", reason: "Too many wrong tokens. Try again in an hour." });
    }
    const header = req.headers.authorization;
    const given = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!safeEqual(given, token)) {
      await cache.incr(failKey, 3600);
      req.log.warn({ admin: "wrong_token" }, "admin request refused");
      return reply
        .code(401)
        .send({ error: "unauthorized", reason: "Wrong or missing admin token." });
    }
  };

  app.get("/v1/admin/appeals", { preHandler: auth }, async (req, reply) => {
    const q = listQuery.safeParse(req.query);
    if (!q.success) return badRequest(reply, q.error);
    return { appeals: await appeals.list(q.data.status) };
  });

  app.post<{ Params: { id: string } }>(
    "/v1/admin/appeals/:id",
    { preHandler: auth },
    async (req, reply) => {
      const b = decisionBody.safeParse(req.body);
      if (!b.success || !z.string().uuid().safeParse(req.params.id).success) {
        return badRequest(
          reply,
          'Send {"decision": "upheld" | "rejected", "note"?} for a valid id',
        );
      }
      const ref = await appeals.resolve(req.params.id, b.data.decision, b.data.note || null);
      if (!ref) {
        return reply.code(404).send({ error: "not_found", reason: "No open appeal with this id." });
      }
      // The kind only: the value can be a private phone number.
      req.log.info(
        {
          admin: "appeal_decided",
          appealId: req.params.id,
          decision: b.data.decision,
          kind: ref.kind,
        },
        "appeal decided",
      );
      return { status: b.data.decision, identifier: ref };
    },
  );
}
