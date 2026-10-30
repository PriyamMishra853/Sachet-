-- Owners of a wrongly flagged number, UPI ID or website can ask for a review.
-- An operator decides. An upheld appeal sets identifiers.cleared_at: reports
-- made before it stop counting, so 3 SIMs can't keep an honest shop marked
-- HIGH RISK. New reports after the review still count.
ALTER TABLE identifiers ADD COLUMN cleared_at timestamptz;

CREATE TABLE appeals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_id  bigint NOT NULL REFERENCES identifiers (id) ON DELETE CASCADE,
  -- Salted hash of the browser or app ID that asked, so "Delete my data" can remove it.
  appellant_hash text NOT NULL,
  -- Redacted like report text.
  reason         text NOT NULL,
  -- How the owner wants to be contacted, if they gave one. Set to NULL once decided.
  contact        text,
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'rejected')),
  decision_note  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);
-- One open appeal per identifier: a second request waits for the first decision.
CREATE UNIQUE INDEX appeals_one_open_idx ON appeals (identifier_id) WHERE status = 'open';
CREATE INDEX appeals_appellant_idx ON appeals (appellant_hash);
CREATE INDEX appeals_status_idx ON appeals (status, created_at);

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
