import type { RiskBand, ScamType } from "@sachet/core";
import type { Sql } from "./sql.js";
import type { IdentifierRef, Store, StoredIdentifier } from "./store.js";

type IdentifierRow = {
  kind: StoredIdentifier["kind"];
  value: string;
  report_count: number;
  risk_band: RiskBand;
  source: StoredIdentifier["source"];
  scam_type: ScamType | null;
};

// Recounts DIFFERENT reporters for the given identifiers. Run after every
// change to reports, so one person reporting the same number 5 times still
// counts as 1, and deleted reports stop counting.
const RECOUNT = `
  UPDATE identifiers i
     SET report_count = COALESCE(sub.n, 0), last_seen = now()
    FROM (SELECT x.id, (SELECT count(DISTINCT r.reporter_hash)::int
                          FROM report_items ri JOIN reports r ON r.id = ri.report_id
                         WHERE ri.identifier_id = x.id) AS n
            FROM unnest($1::bigint[]) AS x(id)) sub
   WHERE i.id = sub.id`;

export function createPgStore(sql: Sql): Store {
  const splitRefs = (refs: IdentifierRef[]) => [refs.map((r) => r.kind), refs.map((r) => r.value)];

  return {
    async lookup(refs) {
      if (refs.length === 0) return [];
      const { rows } = await sql.query<IdentifierRow>(
        `SELECT i.kind, i.value_norm AS value, i.report_count, i.risk_band, i.source,
                (SELECT mode() WITHIN GROUP (ORDER BY r.scam_type)
                   FROM report_items ri JOIN reports r ON r.id = ri.report_id
                  WHERE ri.identifier_id = i.id AND r.scam_type IS NOT NULL) AS scam_type
           FROM identifiers i
           JOIN unnest($1::text[], $2::text[]) AS q(kind, value)
             ON i.kind = q.kind AND i.value_norm = q.value`,
        splitRefs(refs),
      );
      return rows.map((r) => ({
        kind: r.kind,
        value: r.value,
        reportCount: r.report_count,
        riskBand: r.risk_band,
        source: r.source,
        scamType: r.scam_type,
      }));
    },

    async createReport(r) {
      // One statement: insert the report (or do nothing if the idempotency
      // key exists), upsert its identifiers, and link them. Postgres runs a
      // single statement atomically, so we never leave half a report behind.
      const [kinds, values] = splitRefs(r.identifiers);
      const { rows } = await sql.query<{ report_id: string | null; ids: number[] | null }>(
        `WITH new_report AS (
           INSERT INTO reports (channel, reporter_hash, scam_type, text_redacted, amount_inr, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id
         ), upserted AS (
           INSERT INTO identifiers (kind, value_norm)
           SELECT DISTINCT q.kind, q.value FROM unnest($7::text[], $8::text[]) AS q(kind, value)
            WHERE EXISTS (SELECT 1 FROM new_report)
           ON CONFLICT (kind, value_norm) DO UPDATE SET last_seen = now()
           RETURNING id
         ), linked AS (
           INSERT INTO report_items (report_id, identifier_id)
           SELECT new_report.id, upserted.id FROM new_report, upserted
           RETURNING identifier_id
         )
         SELECT (SELECT id FROM new_report) AS report_id,
                (SELECT array_agg(identifier_id) FROM linked) AS ids`,
        [
          r.channel,
          r.reporterHash,
          r.scamType,
          r.textRedacted,
          r.amountInr,
          r.idempotencyKey,
          kinds,
          values,
        ],
      );
      const row = rows[0];
      if (!row?.report_id) {
        const existing = await sql.query<{ id: string }>(
          "SELECT id FROM reports WHERE idempotency_key = $1",
          [r.idempotencyKey],
        );
        return { reportId: existing.rows[0]!.id, duplicate: true };
      }
      // Data-changing CTEs can't see each other's rows, so the recount is a
      // second statement.
      if (row.ids?.length) await sql.query(RECOUNT, [row.ids]);
      return { reportId: row.report_id, duplicate: false };
    },

    async recordCheck(c) {
      const { rows } = await sql.query<{ id: string }>(
        `INSERT INTO checks (channel, user_hash, verdict_band, scam_type, amount_inr)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [c.channel, c.userHash, c.verdictBand, c.scamType, c.amountInr],
      );
      return rows[0]!.id;
    },

    async dueFollowups(olderThan, limit) {
      const { rows } = await sql.query<{ id: string }>(
        `SELECT id FROM checks
          WHERE followup_sent_at IS NULL AND verdict_band IN ('medium', 'high')
            AND created_at <= $1
          ORDER BY created_at LIMIT $2`,
        [olderThan.toISOString(), limit],
      );
      return rows.map((r) => r.id);
    },

    async markFollowupSent(checkId) {
      await sql.query("UPDATE checks SET followup_sent_at = now() WHERE id = $1", [checkId]);
    },

    async setUserPaid(checkId, userHash, paid) {
      const { rows } = await sql.query(
        "UPDATE checks SET user_paid = $3 WHERE id = $1 AND user_hash = $2 RETURNING id",
        [checkId, userHash, paid],
      );
      return rows.length > 0;
    },

    async upsertSeed(entries) {
      if (entries.length === 0) return 0;
      const { rows } = await sql.query<{ n: number }>(
        `WITH up AS (
           INSERT INTO identifiers (kind, value_norm, source, risk_band)
           SELECT DISTINCT ON (q.kind, q.value) q.kind, q.value, q.source, q.band
             FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) AS q(kind, value, source, band)
           ON CONFLICT (kind, value_norm) DO UPDATE
             SET source = EXCLUDED.source, risk_band = EXCLUDED.risk_band, last_seen = now()
           RETURNING 1
         ) SELECT count(*)::int AS n FROM up`,
        [
          entries.map((e) => e.kind),
          entries.map((e) => e.value),
          entries.map((e) => e.source),
          entries.map((e) => e.riskBand),
        ],
      );
      return rows[0]?.n ?? 0;
    },

    async deleteUserData(userHash) {
      const affected = await sql.query<{ identifier_id: number }>(
        `SELECT DISTINCT ri.identifier_id FROM report_items ri
           JOIN reports r ON r.id = ri.report_id WHERE r.reporter_hash = $1`,
        [userHash],
      );
      const reports = await sql.query<{ id: string }>(
        "DELETE FROM reports WHERE reporter_hash = $1 RETURNING id",
        [userHash],
      );
      const checks = await sql.query<{ id: string }>(
        "DELETE FROM checks WHERE user_hash = $1 RETURNING id",
        [userHash],
      );
      const ids = affected.rows.map((r) => r.identifier_id);
      if (ids.length) await sql.query(RECOUNT, [ids]);
      return { reports: reports.rows.length, checks: checks.rows.length };
    },

    async stats() {
      const { rows } = await sql.query<{ checks: number; reports: number; protected: number }>(
        `SELECT (SELECT count(*)::int FROM checks) AS checks,
                (SELECT count(*)::int FROM reports) AS reports,
                (SELECT COALESCE(sum(amount_inr), 0)::int FROM checks
                  WHERE user_paid = 'no' AND verdict_band IN ('medium', 'high')) AS protected`,
      );
      const r = rows[0]!;
      return { checks: r.checks, reports: r.reports, moneyProtectedInr: r.protected };
    },

    async ping() {
      try {
        await sql.query("SELECT 1");
        return true;
      } catch {
        return false;
      }
    },
  };
}
