-- Records lot-level stock deductions at dispatch for receive credit / rejection return.

CREATE TABLE IF NOT EXISTS inventory.stock_transfer_allocations (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stock_transfer_line_id uuid NOT NULL,
  source_stock_id uuid NOT NULL,
  lot_id uuid,
  qty numeric(12, 3) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfer_allocations_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT stock_transfer_allocations_qty_chk CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_transfer_allocations_line
  ON inventory.stock_transfer_allocations (iq_tenant_id, stock_transfer_line_id, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_transfer_allocations_line_fk'
  ) THEN
    ALTER TABLE inventory.stock_transfer_allocations
      ADD CONSTRAINT inventory_stock_transfer_allocations_line_fk
      FOREIGN KEY (iq_tenant_id, stock_transfer_line_id)
      REFERENCES inventory.stock_transfer_lines (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;
