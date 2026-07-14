-- Allow return-derived statuses on dispense headers and queue projection rows.
-- Legacy DBs may still use dispense_records_* constraint names after table rename.

ALTER TABLE pharmacy.dispense
  DROP CONSTRAINT IF EXISTS dispense_dispense_status_check;
ALTER TABLE pharmacy.dispense
  DROP CONSTRAINT IF EXISTS dispense_records_dispense_status_check;

ALTER TABLE pharmacy.dispense
  ADD CONSTRAINT dispense_dispense_status_check
  CHECK (dispense_status IN ('issued', 'partial_issue', 'partially_returned', 'fully_returned'));

ALTER TABLE pharmacy.queue_projection
  DROP CONSTRAINT IF EXISTS queue_projection_dispense_status_check;
ALTER TABLE pharmacy.queue_projection
  DROP CONSTRAINT IF EXISTS opd_queue_projection_dispense_status_check;

ALTER TABLE pharmacy.queue_projection
  ADD CONSTRAINT queue_projection_dispense_status_check
  CHECK (dispense_status IN ('pending', 'issued', 'partial_issue', 'partially_returned', 'fully_returned'));
