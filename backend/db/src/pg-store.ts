import type { Channel, RiskBand, ScamType } from "@sachet/core";
import type { Sql } from "./sql.js";
import type { AppealRecord, IdentifierRef, ReviewState, Store, StoredIdentifier } from "./store.js";

type IdentifierRow = {
  kind: StoredIdentifier["kind"];
  value: string;
  report_count: number;
  risk_band: RiskBand;
  source: StoredIdentifier["source"];
  scam_type: ScamType | null;
  review: ReviewState;
};

type AppealRow = {
  id: string;
  reason: string;
  contact: string | null;
  status: AppealRecord["status"];
  decision_note: string | null;
  created_at: Date | string;
  resolved_at: Date | string | null;
  kind: StoredIdentifier["kind"];
  value: string;
  report_count: number;
  risk_band: RiskBand;
  source: StoredIdentifier["source"];
  recent: {
    channel: Channel;
    scam_type: ScamType | null;
    text_redacted: string | null;
    created_at: string;
  }[];
};

// Reports that still count for identifier i: all of them, or only those
// made after an upheld appeal cleared it.
const COUNTS = "(i.cleared_at IS NULL OR r.created_at > i.cleared_at)";

// Recounts DIFFERENT reporters for the given identifiers. Run after every
// change to reports, so one person reporting the same number 5 times still
// counts as 1, and deleted (or cleared) reports stop counting.
const RECOUNT = `
  UPDATE identifiers i
     SET report_count = (SELECT count(DISTINCT r.reporter_hash)::int
                           FROM report_items ri JOIN reports r ON r.id = ri.report_id
                          WHERE ri.identifier_id = i.id AND ${COUNTS}),
         last_seen = now()
   WHERE i.id = ANY($1::bigint[])`;

const iso = (d: Date | string) => new Date(d).toISOString();

export function createPgStore(sql: Sql): Store {
  const splitRefs = (refs: IdentifierRef[]) => [refs.map((r) => r.kind), refs.map((r) => r.value)];

  return {
    async lookup(refs) {
      if (refs.length === 0) return [];
      const { rows } = await sql.query<IdentifierRow>(
        `SELECT i.kind, i.value_norm AS value, i.report_count, i.risk_band, i.source,
                (SELECT mode() WITHIN GROUP (ORDER BY r.scam_type)
                   FROM report_items ri JOIN reports r ON r.id = ri.report_id
                  WHERE ri.identifier_id = i.id AND r.scam_type IS NOT NULL AND ${COUNTS}) AS scam_type,
                CASE WHEN EXISTS (SELECT 1 FROM appeals a
                                   WHERE a.identifier_id = i.id AND a.status = 'open') THEN 'open'
                     WHEN i.cleared_at IS NOT NULL THEN 'cleared' END AS review
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
        review: r.review,
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
      const appeals = await sql.query<{ id: string }>(
        "DELETE FROM appeals WHERE appellant_hash = $1 RETURNING id",
        [userHash],
      );
      const ids = affected.rows.map((r) => r.identifier_id);
      if (ids.length) await sql.query(RECOUNT, [ids]);
      return {
        reports: reports.rows.length,
        checks: checks.rows.length,
        appeals: appeals.rows.length,
      };
    },

    async createAppeal(a) {
      // Only something Sachet warns about can be appealed. The partial unique
      // index allows one open appeal per identifier; a second does nothing.
      const { rows } = await sql.query<{ id: string }>(
        `WITH target AS (
           SELECT id FROM identifiers
            WHERE kind = $1 AND value_norm = $2
              AND (report_count > 0 OR risk_band IN ('medium', 'high'))
         )
         INSERT INTO appeals (identifier_id, appellant_hash, reason, contact)
         SELECT id, $3, $4, $5 FROM target
         ON CONFLICT (identifier_id) WHERE status = 'open' DO NOTHING
         RETURNING id`,
        [a.kind, a.value, a.appellantHash, a.reason, a.contact],
      );
      if (rows[0]) return { ok: true, appealId: rows[0].id };
      const open = await sql.query(
        `SELECT 1 FROM appeals ap JOIN identifiers i ON i.id = ap.identifier_id
          WHERE i.kind = $1 AND i.value_norm = $2 AND ap.status = 'open'`,
        [a.kind, a.value],
      );
      return { ok: false, error: open.rows.length ? "already_open" : "not_listed" };
    },

    async listAppeals(status, limit) {
      const { rows } = await sql.query<AppealRow>(
        `SELECT a.id, a.reason, a.contact, a.status, a.decision_note, a.created_at, a.resolved_at,
                i.kind, i.value_norm AS value, i.report_count, i.risk_band, i.source,
                (SELECT COALESCE(json_agg(x ORDER BY x.created_at DESC), '[]'::json)
                   FROM (SELECT r.channel, r.scam_type, r.text_redacted, r.created_at
                           FROM report_items ri JOIN reports r ON r.id = ri.report_id
                          WHERE ri.identifier_id = i.id
                          ORDER BY r.created_at DESC LIMIT 5) x) AS recent
           FROM appeals a JOIN identifiers i ON i.id = a.identifier_id
          WHERE a.status = $1
          ORDER BY a.created_at
          LIMIT $2`,
        [status, limit],
      );
      return rows.map((r) => ({
        id: r.id,
        identifier: {
          kind: r.kind,
          value: r.value,
          reportCount: r.report_count,
          riskBand: r.risk_band,
          source: r.source,
        },
        reason: r.reason,
        contact: r.contact,
        status: r.status,
        decisionNote: r.decision_note,
        createdAt: iso(r.created_at),
        resolvedAt: r.resolved_at ? iso(r.resolved_at) : null,
        recentReports: r.recent.map((x) => ({
          channel: x.channel,
          scamType: x.scam_type,
          textRedacted: x.text_redacted,
          createdAt: iso(x.created_at),
        })),
      }));
    },

    async resolveAppeal(id, decision, note) {
      // The owner's contact is only needed until the decision, so it goes.
      const { rows } = await sql.query<{ id: number; kind: IdentifierRef["kind"]; value: string }>(
        `WITH done AS (
           UPDATE appeals
              SET status = $2::text, decision_note = $3, resolved_at = now(), contact = NULL
            WHERE id = $1 AND status = 'open'
           RETURNING identifier_id
         ), cleared AS (
           UPDATE identifiers i SET cleared_at = now(), risk_band = 'unknown'
             FROM done WHERE i.id = done.identifier_id AND $2::text = 'upheld'
           RETURNING i.id
         )
         SELECT i.id, i.kind, i.value_norm AS value
           FROM identifiers i JOIN done ON i.id = done.identifier_id`,
        [id, decision, note],
      );
      const row = rows[0];
      if (!row) return null;
      // A separate statement, so the recount sees the new cleared_at.
      if (decision === "upheld") await sql.query(RECOUNT, [[row.id]]);
      return { kind: row.kind, value: row.value };
    },

    async stats() {
      const { rows } = await sql.query<{ checks: number; reports: number; protected: number }>(
        `SELECT (SELECT count(*)::int FROM checks) AS checks,
                (SELECT count(*)::int FROM reports) AS reports,
                (SELECT COALESCE(sum(amount_inr), 0)::bigint FROM checks
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
