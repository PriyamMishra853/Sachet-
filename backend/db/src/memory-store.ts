import { randomUUID } from "node:crypto";
import type { ScamType } from "@sachet/core";
import type {
  AppealRecord,
  NewAppeal,
  NewCheck,
  NewReport,
  Store,
  StoredIdentifier,
} from "./store.js";

type IdentifierEntry = Omit<StoredIdentifier, "reportCount" | "scamType" | "review"> & {
  /** `tick` of the upheld appeal; reports at or before it don't count. */
  clearedAt?: number;
};

// In-memory Store with the same behaviour as the Postgres one. Used when
// DATABASE_URL is not set (local dev before Supabase exists) and in API
// tests. Data is lost on restart.
export function createMemoryStore(): Store {
  const identifiers = new Map<string, IdentifierEntry>();
  const reports = new Map<string, NewReport & { id: string; at: number; createdAt: Date }>();
  const reportByKey = new Map<string, string>();
  const checks = new Map<
    string,
    NewCheck & { id: string; createdAt: Date; followupSentAt?: Date; userPaid?: "yes" | "no" }
  >();
  const appeals = new Map<
    string,
    NewAppeal & Pick<AppealRecord, "id" | "status" | "decisionNote" | "createdAt" | "resolvedAt">
  >();
  const key = (kind: string, value: string) => `${kind}:${value}`;
  // A counter instead of the clock orders reports and appeal decisions, so two
  // things in the same millisecond still have a clear before and after.
  let tick = 0;

  const reportsFor = (k: string) => {
    const cleared = identifiers.get(k)?.clearedAt ?? -1;
    return [...reports.values()].filter(
      (r) => r.at > cleared && r.identifiers.some((i) => key(i.kind, i.value) === k),
    );
  };
  const reportCount = (k: string) => new Set(reportsFor(k).map((r) => r.reporterHash)).size;
  const openAppealFor = (k: string) =>
    [...appeals.values()].find((a) => a.status === "open" && key(a.kind, a.value) === k);

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
        const { clearedAt, ...stored } = row;
        out.push({
          ...stored,
          reportCount: reportCount(k),
          scamType: mostCommon(rs.flatMap((r) => (r.scamType ? [r.scamType] : []))),
          review: openAppealFor(k) ? "open" : clearedAt !== undefined ? "cleared" : null,
        });
      }
      return out;
    },

    async createReport(r) {
      const existing = reportByKey.get(r.idempotencyKey);
      if (existing) return { reportId: existing, duplicate: true };
      const id = randomUUID();
      reports.set(id, { ...r, id, at: ++tick, createdAt: new Date() });
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
        const k = key(e.kind, e.value);
        identifiers.set(k, {
          ...identifiers.get(k),
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
      let nAppeals = 0;
      for (const [id, a] of appeals) {
        if (a.appellantHash === userHash) {
          appeals.delete(id);
          nAppeals++;
        }
      }
      return { reports: nReports, checks: nChecks, appeals: nAppeals };
    },

    async createAppeal(a) {
      const k = key(a.kind, a.value);
      const row = identifiers.get(k);
      const listed =
        row && (reportCount(k) > 0 || row.riskBand === "medium" || row.riskBand === "high");
      if (!listed) return { ok: false, error: "not_listed" };
      if (openAppealFor(k)) return { ok: false, error: "already_open" };
      const id = randomUUID();
      appeals.set(id, {
        ...a,
        id,
        status: "open",
        decisionNote: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      });
      return { ok: true, appealId: id };
    },

    async listAppeals(status, limit) {
      return [...appeals.values()]
        .filter((a) => a.status === status)
        .slice(0, limit)
        .map((a) => {
          const k = key(a.kind, a.value);
          const row = identifiers.get(k)!;
          const recent = [...reports.values()]
            .filter((r) => r.identifiers.some((i) => key(i.kind, i.value) === k))
            .sort((x, y) => y.at - x.at)
            .slice(0, 5);
          return {
            id: a.id,
            identifier: {
              kind: a.kind,
              value: a.value,
              reportCount: reportCount(k),
              riskBand: row.riskBand,
              source: row.source,
            },
            reason: a.reason,
            contact: a.contact,
            status: a.status,
            decisionNote: a.decisionNote,
            createdAt: a.createdAt,
            resolvedAt: a.resolvedAt,
            recentReports: recent.map((r) => ({
              channel: r.channel,
              scamType: r.scamType,
              textRedacted: r.textRedacted,
              createdAt: r.createdAt.toISOString(),
            })),
          };
        });
    },

    async resolveAppeal(id, decision, note) {
      const a = appeals.get(id);
      if (!a || a.status !== "open") return null;
      a.status = decision;
      a.decisionNote = note;
      a.resolvedAt = new Date().toISOString();
      a.contact = null;
      if (decision === "upheld") {
        const row = identifiers.get(key(a.kind, a.value));
        if (row) {
          row.clearedAt = ++tick;
          row.riskBand = "unknown";
        }
      }
      return { kind: a.kind, value: a.value };
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
