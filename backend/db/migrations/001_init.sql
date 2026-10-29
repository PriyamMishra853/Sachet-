-- Sachet V1 schema: 4 tables.
-- Enum-like columns use text + CHECK instead of Postgres ENUM types, because
-- adding a value to a CHECK is a one-line migration and ENUMs are awkward to change.

CREATE TABLE identifiers (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('phone', 'upi', 'domain')),
  value_norm   text NOT NULL,
  -- Number of DIFFERENT people who reported it (one person reporting twice counts once).
  report_count integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  risk_band    text NOT NULL DEFAULT 'unknown'
               CHECK (risk_band IN ('unknown', 'low', 'medium', 'high')),
  source       text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'seed', 'safe_browsing')),
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  -- Every check looks up by (kind, value_norm); this unique index makes that
  -- lookup a single B-tree search and stops duplicate rows.
  UNIQUE (kind, value_norm)
);

CREATE TABLE reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'web')),
  -- Salted hash of the reporter's chat ID or phone; never the raw value.
  reporter_hash   text NOT NULL,
  scam_type       text CHECK (scam_type IN ('investment', 'digital_arrest', 'parcel', 'kyc',
                    'electricity', 'task_job', 'upi_refund', 'lottery', 'loan_app', 'fake_support')),
  text_redacted   text,
  amount_inr      integer CHECK (amount_inr >= 0),
  -- A retried request (WhatsApp resends, double taps) carries the same key,
  -- so the second insert hits this constraint instead of creating a duplicate.
  idempotency_key text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_reporter_hash_idx ON reports (reporter_hash);

CREATE TABLE report_items (
  report_id     uuid   NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  identifier_id bigint NOT NULL REFERENCES identifiers (id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, identifier_id)
);
-- The primary key indexes report_id first; counting reporters per identifier
-- needs the other direction.
CREATE INDEX report_items_identifier_idx ON report_items (identifier_id);

-- One row per check, so "money protected" can be counted from day one.
CREATE TABLE checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          text NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'web')),
  user_hash        text NOT NULL,
  verdict_band     text NOT NULL CHECK (verdict_band IN ('unknown', 'low', 'medium', 'high')),
  scam_type        text,
  amount_inr       integer CHECK (amount_inr >= 0),
  followup_sent_at timestamptz,
  user_paid        text CHECK (user_paid IN ('yes', 'no')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checks_user_hash_idx ON checks (user_hash);
-- Partial index: the follow-up job only ever scans risky checks not yet followed up.
CREATE INDEX checks_followup_due_idx ON checks (created_at)
  WHERE followup_sent_at IS NULL AND verdict_band IN ('medium', 'high');

-- Supabase exposes every table in "public" through its REST API using the
-- public anon key. Row Level Security with no policies blocks that API
-- completely; only our server (connecting as the database owner) can read.
ALTER TABLE identifiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks       ENABLE ROW LEVEL SECURITY;
