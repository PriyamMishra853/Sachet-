import {
  analyzeText,
  buildVerdict,
  normalizePhone,
  normalizeUpi,
  normalizeUrl,
  redact,
  type Channel,
  type IdentifierLookup,
  type ScamType,
  type TextAnalysis,
  type Verdict,
} from "@sachet/core";
import type { IdentifierRef, Store } from "@sachet/db";
import type { FastifyBaseLogger } from "fastify";
import type { Cache } from "../cache.js";
import type { AiCheck } from "./ai-check.js";
import type { DomainAge } from "./domain-age.js";
import type { SafeBrowsing } from "./safe-browsing.js";

export type CheckType = "phone" | "upi" | "url";
export type Ctx = {
  channel: Channel;
  userHash: string;
  /** Hashed network of a web user. Reports from one network count once per identifier. */
  network?: string;
};

export const CACHE_TTL_SECONDS = 10 * 60;
export const REPORTS_PER_HOUR = 20;
const NETWORK_REPORT_TTL = 30 * 24 * 3600;

type Ref = IdentifierRef & { url?: string };
/** Where a verdict for one identifier is cached. Anything that changes it must delete this key. */
export const cacheKey = (r: IdentifierRef) => `id:${r.kind}:${r.value}`;

/** Reads what a person typed as a phone number, UPI ID or link. */
export function normalizeInput(type: CheckType, raw: string) {
  return type === "phone"
    ? normalizePhone(raw)
    : type === "upi"
      ? normalizeUpi(raw)
      : normalizeUrl(raw);
}

// The one place that turns input into a verdict. The HTTP routes and both
// bots call this, so every channel gives the same answer.
export function createChecker(deps: {
  store: Store;
  cache: Cache;
  safeBrowsing: SafeBrowsing;
  /** Registration dates of websites (RDAP). Without it, no "new website" warning. */
  domainAge?: DomainAge;
  /** Second opinion on message text from an AI model. Without it, rules only. */
  aiCheck?: AiCheck;
  log: FastifyBaseLogger;
}) {
  const { store, cache, safeBrowsing, log } = deps;
  const domainAge = deps.domainAge ?? { check: async () => new Map<string, number>() };

  // Cache-aside: read the cache; on a miss read the database (and, for links,
  // Safe Browsing and the registration records), then fill the cache for 10 minutes.
  async function lookup(refs: Ref[]): Promise<IdentifierLookup[]> {
    const out: IdentifierLookup[] = [];
    const misses: Ref[] = [];
    for (const ref of refs) {
      const hit = await cache.get(cacheKey(ref)).catch(() => null);
      // The kind only: the value can be a private phone number.
      log.info({ cache: hit ? "HIT" : "MISS", kind: ref.kind }, "identifier lookup");
      if (hit) out.push(JSON.parse(hit) as IdentifierLookup);
      else misses.push(ref);
    }
    if (misses.length === 0) return out;

    const [stored, flaggedUrls, ages] = await Promise.all([
      store.lookup(misses.map(({ kind, value }) => ({ kind, value }))),
      safeBrowsing.check(misses.flatMap((r) => (r.url ? [r.url] : []))),
      domainAge.check(misses.flatMap((r) => (r.kind === "domain" ? [r.value] : []))),
    ]);

    for (const ref of misses) {
      const row = stored.find((s) => s.kind === ref.kind && s.value === ref.value);
      const sbHit = ref.url ? flaggedUrls.has(ref.url) : false;
      const result: IdentifierLookup = {
        kind: ref.kind,
        value: ref.value,
        reportCount: row?.reportCount ?? 0,
        storedBand: row?.riskBand ?? "unknown",
        source: row?.source ?? null,
        scamType: row?.scamType ?? null,
        safeBrowsingHit: sbHit,
        review: row?.review ?? null,
        ...(ref.kind === "domain" && { domainAgeDays: ages.get(ref.value) ?? null }),
      };
      if (sbHit && row?.source !== "seed") {
        // Remember Google's answer so the next check doesn't need to ask.
        void store
          .upsertSeed([
            { kind: ref.kind, value: ref.value, source: "safe_browsing", riskBand: "high" },
          ])
          .catch((err) => log.warn({ err }, "could not save Safe Browsing hit"));
      }
      await cache.set(cacheKey(ref), JSON.stringify(result), CACHE_TTL_SECONDS).catch(() => {});
      out.push(result);
    }
    return out;
  }

  async function record(
    ctx: Ctx,
    verdict: Verdict,
    amountInr: number | null,
  ): Promise<string | null> {
    try {
      return await store.recordCheck({
        channel: ctx.channel,
        userHash: ctx.userHash,
        verdictBand: verdict.band,
        scamType: verdict.scamType,
        amountInr,
      });
    } catch (err) {
      log.warn({ err }, "could not record check");
      return null;
    }
  }

  function refsFromText(analysis: TextAnalysis): Ref[] {
    const e = analysis.extracted;
    const seen = new Set<string>();
    const refs: Ref[] = [];
    const add = (r: Ref) => {
      const k = cacheKey(r);
      if (seen.has(k)) return;
      seen.add(k);
      refs.push(r);
    };
    for (const v of e.phones) add({ kind: "phone", value: v });
    for (const v of e.upis) add({ kind: "upi", value: v });
    for (const l of e.links) add({ kind: "domain", value: l.domain, url: l.url });
    return refs;
  }

  return {
    async checkIdentifier(type: CheckType, raw: string, ctx: Ctx) {
      const norm = normalizeInput(type, raw);
      if (!norm.ok) return { ok: false as const, reason: norm.reason };
      // Links keep their full URL for Safe Browsing; phones and UPI IDs have none.
      const ref: Ref = { kind: norm.kind, value: norm.value };
      if ("url" in norm) ref.url = String(norm.url);

      const verdict = buildVerdict({ lookups: await lookup([ref]) });
      const checkId = await record(ctx, verdict, null);
      return { ok: true as const, kind: norm.kind, value: norm.value, verdict, checkId };
    },

    /** `sender`: what the phone shows as the SMS sender ("VM-HDFCBK-S" or a number), if known. */
    async checkMessage(text: string, ctx: Ctx, sender?: string | null) {
      const analysis = analyzeText(text, { sender });
      // Only when the rules aren't already sure: each opinion costs money and time.
      const askAi = deps.aiCheck && analysis.band !== "high";
      const [lookups, ai] = await Promise.all([
        lookup(refsFromText(analysis)),
        askAi ? deps.aiCheck!.opinion(text) : null,
      ]);
      const verdict = buildVerdict({ lookups, text: analysis, ai });
      const amount = analysis.extracted.amounts.length
        ? Math.max(...analysis.extracted.amounts)
        : null;
      const checkId = await record(ctx, verdict, amount);
      return { verdict, analysis, checkId };
    },

    async report(
      input: {
        identifiers?: { type: CheckType; value: string }[];
        text?: string;
        scamType?: ScamType | null;
        amountInr?: number | null;
        idempotencyKey: string;
      },
      ctx: Ctx,
    ) {
      const refs: Ref[] = [];
      for (const i of input.identifiers ?? []) {
        const n = normalizeInput(i.type, i.value);
        if (!n.ok)
          return {
            ok: false as const,
            error: "invalid_identifier",
            reason: `${i.value}: ${n.reason}`,
          };
        refs.push({ kind: n.kind, value: n.value });
      }
      const analysis = input.text ? analyzeText(input.text) : null;
      if (analysis) refs.push(...refsFromText(analysis));
      let unique = [
        ...new Map(refs.map((r) => [cacheKey(r), { kind: r.kind, value: r.value }])).values(),
      ];
      if (unique.length === 0) {
        return {
          ok: false as const,
          error: "no_identifiers",
          reason: "Add a phone number, UPI ID or link to report.",
        };
      }

      // Fixed-window rate limit: at most 20 reports per person per hour.
      const used = await cache.incr(`rl:report:${ctx.userHash}`, 3600);
      if (used > REPORTS_PER_HOUR) {
        return {
          ok: false as const,
          error: "rate_limited",
          reason: "Too many reports. Try again in an hour.",
        };
      }

      // A web browser can make up a new ID for every report, so on the web
      // "3 different people" means 3 different networks. Without this, one
      // person could mark any honest shop's number as HIGH RISK in a minute.
      const claimed: string[] = [];
      if (ctx.network) {
        const fresh = [];
        for (const r of unique) {
          const key = `rep:net:${ctx.network}:${cacheKey(r)}`;
          if (await cache.setIfAbsent(key, "1", NETWORK_REPORT_TTL)) {
            fresh.push(r);
            claimed.push(key);
          }
        }
        if (fresh.length === 0) {
          return { ok: true as const, reportId: null, duplicate: true, identifiers: unique };
        }
        unique = fresh;
      }

      const amounts = analysis?.extracted.amounts ?? [];
      const result = await store
        .createReport({
          channel: ctx.channel,
          reporterHash: ctx.userHash,
          scamType: input.scamType ?? analysis?.scamType ?? null,
          textRedacted: input.text ? redact(input.text).slice(0, 2000) : null,
          amountInr: input.amountInr ?? (amounts.length ? Math.max(...amounts) : null),
          idempotencyKey: input.idempotencyKey,
          identifiers: unique,
        })
        .catch(async (err: unknown) => {
          // Not saved: let this network report it again on retry.
          if (claimed.length) await cache.del(...claimed).catch(() => {});
          throw err;
        });
      // A new report changes the answer for these identifiers: drop the cached one.
      await cache.del(...unique.map(cacheKey)).catch(() => {});
      return { ok: true as const, ...result, identifiers: unique };
    },
  };
}

export type Checker = ReturnType<typeof createChecker>;
