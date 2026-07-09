-- Transfer receive: extended statuses and line-level receipt fields.

ALTER TABLE inventory.stock_transfers
  DROP CONSTRAINT IF EXISTS stock_transfers_status_chk;

ALTER TABLE inventory.stock_transfers
  ADD CONSTRAINT stock_transfers_status_chk CHECK (
    status IN (
      'draft',
      'in_transit',
      'partially_received',
      'completed',
      'rejected',
      'cancelled'
    )
  );

ALTER TABLE inventory.stock_transfer_lines
  ADD COLUMN IF NOT EXISTS received_qty numeric(12, 3),
  ADD COLUMN IF NOT EXISTS accepted_qty numeric(12, 3),
  ADD COLUMN IF NOT EXISTS rejected_qty numeric(12, 3),
  ADD COLUMN IF NOT EXISTS rejection_reason text;
