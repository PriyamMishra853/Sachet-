import { redact } from "@sachet/core";
import type { AppealStatus, Store } from "@sachet/db";
import type { Cache } from "../cache.js";
import { cacheKey, normalizeInput, type CheckType } from "./checker.js";

// The owner of a wrongly flagged number, UPI ID or website asks for a review
// here; an operator decides through the admin routes. Each step drops the
// cached verdict, so the next check shows "under review" or "cleared" at once.
export function createAppeals(deps: { store: Store; cache: Cache }) {
  const { store, cache } = deps;

  return {
    async submit(
      input: { type: CheckType; value: string; reason: string; contact?: string },
      appellantHash: string,
    ) {
      const n = normalizeInput(input.type, input.value);
      if (!n.ok) {
        return {
          ok: false as const,
          error: "invalid_identifier" as const,
          reason: `${input.value}: ${n.reason}`,
        };
      }
      const ref = { kind: n.kind, value: n.value };
      const r = await store.createAppeal({
        ...ref,
        appellantHash,
        // Like report text: personal details someone else might be named by go.
        reason: redact(input.reason).slice(0, 1000),
        contact: input.contact?.replace(/\s+/g, " ").trim() || null,
      });
      if (r.ok) await cache.del(cacheKey(ref)).catch(() => {});
      return r;
    },

    list: (status: AppealStatus, limit = 50) => store.listAppeals(status, limit),

    async resolve(id: string, decision: "upheld" | "rejected", note: string | null) {
      const ref = await store.resolveAppeal(id, decision, note);
      if (ref) await cache.del(cacheKey(ref)).catch(() => {});
      return ref;
    },
  };
}

export type Appeals = ReturnType<typeof createAppeals>;
