-- Track how much of each dispatch allocation has been accepted or returned.

ALTER TABLE inventory.stock_transfer_allocations
  ADD COLUMN IF NOT EXISTS accepted_qty numeric(12, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returned_qty numeric(12, 3) NOT NULL DEFAULT 0;
