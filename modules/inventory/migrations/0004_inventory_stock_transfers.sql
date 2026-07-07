-- Stock transfer documents (indent fulfillment handoff).

CREATE TABLE IF NOT EXISTS inventory.stock_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  transfer_number text NOT NULL,
  transfer_date date NOT NULL,
  from_store_id uuid NOT NULL,
  to_store_id uuid NOT NULL,
  transfer_type text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  remarks text,
  inventory_indent_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfers_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT stock_transfers_type_chk CHECK (transfer_type IN ('normal', 'emergency')),
  CONSTRAINT stock_transfers_status_chk CHECK (
    status IN ('draft', 'in_transit', 'completed', 'cancelled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_stock_transfers_tenant_number
  ON inventory.stock_transfers (iq_tenant_id, transfer_number);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_transfers_tenant_date
  ON inventory.stock_transfers (iq_tenant_id, transfer_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_transfers_tenant_indent
  ON inventory.stock_transfers (iq_tenant_id, inventory_indent_id)
  WHERE inventory_indent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory.stock_transfer_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  stock_transfer_id uuid NOT NULL,
  item_id uuid NOT NULL,
  transfer_qty numeric(12, 3) NOT NULL,
  line_remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfer_lines_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT stock_transfer_lines_qty_chk CHECK (transfer_qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_transfer_lines_transfer
  ON inventory.stock_transfer_lines (iq_tenant_id, stock_transfer_id, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_transfers_from_store_fk'
  ) THEN
    ALTER TABLE inventory.stock_transfers
      ADD CONSTRAINT inventory_stock_transfers_from_store_fk
      FOREIGN KEY (iq_tenant_id, from_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_transfers_to_store_fk'
  ) THEN
    ALTER TABLE inventory.stock_transfers
      ADD CONSTRAINT inventory_stock_transfers_to_store_fk
      FOREIGN KEY (iq_tenant_id, to_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_transfers_indent_fk'
  ) THEN
    ALTER TABLE inventory.stock_transfers
      ADD CONSTRAINT inventory_stock_transfers_indent_fk
      FOREIGN KEY (iq_tenant_id, inventory_indent_id)
      REFERENCES inventory.indents (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_transfer_lines_transfer_fk'
  ) THEN
    ALTER TABLE inventory.stock_transfer_lines
      ADD CONSTRAINT inventory_stock_transfer_lines_transfer_fk
      FOREIGN KEY (iq_tenant_id, stock_transfer_id)
      REFERENCES inventory.stock_transfers (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_transfer_lines_item_fk'
  ) THEN
    ALTER TABLE inventory.stock_transfer_lines
      ADD CONSTRAINT inventory_stock_transfer_lines_item_fk
      FOREIGN KEY (iq_tenant_id, item_id)
      REFERENCES inventory.items (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indents_stock_transfer_fk'
  ) THEN
    ALTER TABLE inventory.indents
      ADD CONSTRAINT inventory_indents_stock_transfer_fk
      FOREIGN KEY (iq_tenant_id, inventory_stock_transfer_id)
      REFERENCES inventory.stock_transfers (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory.stock_transfer_sequences (
  iq_tenant_id uuid NOT NULL,
  period_key text NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfer_sequences_pkey PRIMARY KEY (iq_tenant_id, period_key)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_distributed_table') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_dist_partition
    WHERE logicalrelid = 'inventory.stock_transfer_sequences'::regclass
  ) THEN
    PERFORM create_distributed_table('inventory.stock_transfer_sequences', 'iq_tenant_id');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
