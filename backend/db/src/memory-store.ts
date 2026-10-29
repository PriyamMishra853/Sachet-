import { randomUUID } from "node:crypto";
import type { ScamType } from "@sachet/core";
import type { NewCheck, NewReport, Store, StoredIdentifier } from "./store.js";

// In-memory Store with the same behaviour as the Postgres one. Used when
// DATABASE_URL is not set (local dev before Supabase exists) and in API
// tests. Data is lost on restart.
export function createMemoryStore(): Store {
  const identifiers = new Map<string, Omit<StoredIdentifier, "reportCount" | "scamType">>();
  const reports = new Map<string, NewReport & { id: string }>();
  const reportByKey = new Map<string, string>();
  const checks = new Map<
    string,
    NewCheck & { id: string; createdAt: Date; followupSentAt?: Date; userPaid?: "yes" | "no" }
  >();
  const key = (kind: string, value: string) => `${kind}:${value}`;

  const reportsFor = (k: string) =>
    [...reports.values()].filter((r) => r.identifiers.some((i) => key(i.kind, i.value) === k));

  const mostCommon = (types: ScamType[]): ScamType | null => {
    const counts = new Map<ScamType, number>();
    for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
    let best: ScamType | null = null;
    for (const [t, n] of counts) if (!best || n > counts.get(best)!) best = t;
    return best;
  };

  return {
    async lookup(refs) {
      const out: StoredIdentifier[] = [];
      for (const ref of refs) {
        const k = key(ref.kind, ref.value);
        const row = identifiers.get(k);
        if (!row) continue;
        const rs = reportsFor(k);
        out.push({
          ...row,
          reportCount: new Set(rs.map((r) => r.reporterHash)).size,
          scamType: mostCommon(rs.flatMap((r) => (r.scamType ? [r.scamType] : []))),
        });
      }
      return out;
    },

    async createReport(r) {
      const existing = reportByKey.get(r.idempotencyKey);
      if (existing) return { reportId: existing, duplicate: true };
      const id = randomUUID();
      reports.set(id, { ...r, id });
      reportByKey.set(r.idempotencyKey, id);
      for (const i of r.identifiers) {
        const k = key(i.kind, i.value);
        if (!identifiers.has(k)) {
          identifiers.set(k, { ...i, riskBand: "unknown", source: "user" });
        }
      }
      return { reportId: id, duplicate: false };
    },

    async recordCheck(c) {
      const id = randomUUID();
      checks.set(id, { ...c, id, createdAt: new Date() });
      return id;
    },

    async dueFollowups(olderThan, limit) {
      return [...checks.values()]
        .filter(
          (c) =>
            !c.followupSentAt &&
            (c.verdictBand === "medium" || c.verdictBand === "high") &&
            c.createdAt <= olderThan,
        )
        .slice(0, limit)
        .map((c) => c.id);
    },

    async markFollowupSent(id) {
      const c = checks.get(id);
      if (c) c.followupSentAt = new Date();
    },

    async setUserPaid(id, userHash, paid) {
      const c = checks.get(id);
      if (!c || c.userHash !== userHash) return false;
      c.userPaid = paid;
      return true;
    },

    async upsertSeed(entries) {
      for (const e of entries) {
        identifiers.set(key(e.kind, e.value), {
          kind: e.kind,
          value: e.value,
          riskBand: e.riskBand,
          source: e.source,
        });
      }
      return new Set(entries.map((e) => key(e.kind, e.value))).size;
    },

    async deleteUserData(userHash) {
      let nReports = 0;
      let nChecks = 0;
      for (const [id, r] of reports) {
        if (r.reporterHash !== userHash) continue;
        reports.delete(id);
        reportByKey.delete(r.idempotencyKey);
        nReports++;
      }
      for (const [id, c] of checks) {
        if (c.userHash === userHash) {
          checks.delete(id);
          nChecks++;
        }
      }
      return { reports: nReports, checks: nChecks };
    },

    async stats() {
      let protectedInr = 0;
      for (const c of checks.values()) {
        if (c.userPaid === "no" && (c.verdictBand === "medium" || c.verdictBand === "high")) {
          protectedInr += c.amountInr ?? 0;
        }
      }
      return { checks: checks.size, reports: reports.size, moneyProtectedInr: protectedInr };
    },

    async ping() {
      return true;
    },
  };
}
