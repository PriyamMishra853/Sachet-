-- The Android app gets its own channel, so app and website use can be counted
-- apart. The CHECK constraints from 001 are named <table>_<column>_check.
ALTER TABLE reports DROP CONSTRAINT reports_channel_check;
ALTER TABLE reports ADD CONSTRAINT reports_channel_check
  CHECK (channel IN ('telegram', 'whatsapp', 'web', 'android'));

ALTER TABLE checks DROP CONSTRAINT checks_channel_check;
ALTER TABLE checks ADD CONSTRAINT checks_channel_check
  CHECK (channel IN ('telegram', 'whatsapp', 'web', 'android'));
