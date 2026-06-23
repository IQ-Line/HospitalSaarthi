-- Inventory module — operational catalog (stores, items), GRN, stock, indents.
-- Reference masters live in master-data (global_master / tenant_master) — see
-- modules/master-data/alembic/versions/044_inventory_masters_catalog.py.
-- Idempotent boot DDL: never DROP live tables (data must survive service restarts).

CREATE SCHEMA IF NOT EXISTS inventory;

-- ─── Stores ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  store_code text NOT NULL,
  store_name text NOT NULL,
  store_type_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  department_id uuid,
  physical_location text NOT NULL DEFAULT '',
  can_receive_stock boolean NOT NULL DEFAULT false,
  can_dispense boolean NOT NULL DEFAULT false,
  can_issue_to_ward boolean NOT NULL DEFAULT false,
  track_batch_expiry boolean NOT NULL DEFAULT true,
  indent_authority boolean NOT NULL DEFAULT false,
  indent_target_store_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stores_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_inventory_stores_tenant_store_code UNIQUE (iq_tenant_id, store_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stores_tenant_branch
  ON inventory.stores (iq_tenant_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_inventory_stores_tenant_store_type
  ON inventory.stores (iq_tenant_id, store_type_id);

-- ─── Sequences ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory.store_code_sequences (
  iq_tenant_id uuid NOT NULL,
  store_type_id uuid NOT NULL,
  last_sequence integer NOT NULL DEFAULT 0,
  CONSTRAINT store_code_sequences_pkey PRIMARY KEY (iq_tenant_id, store_type_id),
  CONSTRAINT store_code_sequences_last_sequence_nonneg_chk CHECK (last_sequence >= 0)
);

CREATE TABLE IF NOT EXISTS inventory.item_code_sequences (
  iq_tenant_id uuid NOT NULL,
  item_type_id uuid NOT NULL,
  last_sequence integer NOT NULL DEFAULT 0,
  CONSTRAINT item_code_sequences_pkey PRIMARY KEY (iq_tenant_id, item_type_id),
  CONSTRAINT item_code_sequences_last_sequence_nonneg_chk CHECK (last_sequence >= 0)
);

-- ─── Item catalog ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  item_classification text NOT NULL DEFAULT 'inventory',
  item_code text NOT NULL,
  name text NOT NULL,
  display_name text NOT NULL,
  category_id uuid,
  sub_category_id uuid,
  item_type_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  catalog_version integer NOT NULL DEFAULT 1,
  tenant_formulary_id uuid,
  platform_medicine_id uuid,
  manufacturer_id uuid,
  manufacturer_item_code text,
  catalog_number text,
  hsn_gst_id uuid,
  purchase_uom_id uuid NOT NULL,
  consumption_uom_id uuid NOT NULL,
  sale_uom_id uuid NOT NULL,
  conversion_factor numeric(18, 6) NOT NULL DEFAULT 1,
  tracking_mode text NOT NULL DEFAULT 'lot',
  is_expirable boolean NOT NULL DEFAULT false,
  is_short_expiry_monitoring boolean NOT NULL DEFAULT false,
  loose_sale_allowed boolean NOT NULL DEFAULT false,
  reorder_point numeric(12, 3) NOT NULL DEFAULT 0,
  storage_condition_id uuid,
  pack_size text,
  length_cm numeric(10, 2),
  width_cm numeric(10, 2),
  height_cm numeric(10, 2),
  weight_kg numeric(10, 3),
  item_image_url text,
  supporting_document_url text,
  unit_of_measure text NOT NULL,
  storage_conditions text,
  description text,
  supply_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_lot_tracked boolean NOT NULL DEFAULT true,
  is_serial_tracked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT items_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT items_item_classification_chk CHECK (
    item_classification IN ('inventory', 'medicine')
  ),
  CONSTRAINT items_tracking_mode_chk CHECK (
    tracking_mode IN ('none', 'lot', 'serial')
  ),
  CONSTRAINT items_classification_formulary_chk CHECK (
    (item_classification = 'medicine' AND tenant_formulary_id IS NOT NULL)
    OR (item_classification = 'inventory' AND tenant_formulary_id IS NULL)
  ),
  CONSTRAINT items_medicine_tracking_chk CHECK (
    item_classification <> 'medicine'
    OR (tracking_mode = 'lot' AND is_expirable = true)
  ),
  CONSTRAINT items_conversion_factor_positive_chk CHECK (conversion_factor > 0),
  CONSTRAINT items_category_pair_chk CHECK (
    sub_category_id IS NULL OR category_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_tenant_item_code
  ON inventory.items (iq_tenant_id, item_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_tenant_formulary
  ON inventory.items (iq_tenant_id, tenant_formulary_id)
  WHERE tenant_formulary_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_classification
  ON inventory.items (iq_tenant_id, item_classification);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_active
  ON inventory.items (iq_tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category
  ON inventory.items (iq_tenant_id, category_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type
  ON inventory.items (iq_tenant_id, item_type_id);

-- ─── GRN ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory.grns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  grn_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  grn_type text NOT NULL DEFAULT 'purchase',
  grn_date date NOT NULL,
  inventory_store_id uuid NOT NULL,
  manufacturer_id uuid,
  purchase_request_id uuid,
  voucher_invoice_no text NOT NULL DEFAULT '',
  register_page_no text,
  remarks text,
  shipment_document_path text,
  voucher_document_path text,
  created_by uuid,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grns_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT grns_status_chk CHECK (status IN ('draft', 'submitted')),
  CONSTRAINT grns_type_chk CHECK (grn_type IN ('purchase', 'transfer')),
  CONSTRAINT grns_remarks_len_chk CHECK (remarks IS NULL OR char_length(remarks) <= 250)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_grns_tenant_number
  ON inventory.grns (iq_tenant_id, grn_number);

CREATE INDEX IF NOT EXISTS idx_inventory_grns_tenant_status_date
  ON inventory.grns (iq_tenant_id, status, grn_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_grns_manufacturer_invoice_submitted
  ON inventory.grns (iq_tenant_id, manufacturer_id, lower(btrim(voucher_invoice_no)))
  WHERE status = 'submitted'
    AND grn_type = 'purchase'
    AND manufacturer_id IS NOT NULL
    AND length(btrim(voucher_invoice_no)) > 0;

CREATE TABLE IF NOT EXISTS inventory.grn_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  grn_id uuid NOT NULL,
  item_id uuid NOT NULL,
  pr_line_id uuid,
  requested_qty numeric(12, 3),
  grn_qty numeric(12, 3) NOT NULL DEFAULT 0,
  base_uom text NOT NULL DEFAULT '',
  purchase_uom text,
  purchase_to_base_factor numeric(12, 6) NOT NULL DEFAULT 1,
  storage_location text,
  lot_number text NOT NULL DEFAULT '',
  expiry_date date,
  purchase_rate numeric(12, 4) NOT NULL DEFAULT 0,
  line_remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grn_lines_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT grn_lines_purchase_to_base_factor_positive_chk CHECK (purchase_to_base_factor > 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_grn_lines_grn
  ON inventory.grn_lines (iq_tenant_id, grn_id, sort_order);

-- ─── Lots & stock ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory.lots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  item_id uuid NOT NULL,
  inventory_store_id uuid,
  lot_number text NOT NULL,
  expiry_date date,
  manufacture_date date,
  received_date date NOT NULL,
  initial_qty numeric(12, 3) NOT NULL,
  unit_cost numeric(12, 4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lots_pkey PRIMARY KEY (iq_tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_lots_tenant_item_store_lot
  ON inventory.lots (
    iq_tenant_id,
    item_id,
    inventory_store_id,
    lower(btrim(lot_number))
  )
  WHERE inventory_store_id IS NOT NULL
    AND length(btrim(lot_number)) > 0;

CREATE TABLE IF NOT EXISTS inventory.stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  item_id uuid NOT NULL,
  inventory_store_id uuid NOT NULL,
  lot_id uuid,
  quantity numeric(12, 3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_pkey PRIMARY KEY (iq_tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_stock_tenant_item_store_lot
  ON inventory.stock (iq_tenant_id, item_id, inventory_store_id, lot_id);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_tenant_store
  ON inventory.stock (iq_tenant_id, inventory_store_id);

-- ─── Indents ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory.indents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  indent_number text NOT NULL,
  indent_date date NOT NULL,
  from_store_id uuid NOT NULL,
  to_store_id uuid NOT NULL,
  indent_type text NOT NULL DEFAULT 'store_transfer',
  priority text NOT NULL DEFAULT 'normal',
  remarks text,
  status text NOT NULL DEFAULT 'draft',
  fulfillment_route text NOT NULL DEFAULT 'stock_transfer',
  purchase_indent_number text,
  rejection_reason text,
  inventory_stock_transfer_id uuid,
  inventory_purchase_request_id uuid,
  inventory_grn_id uuid,
  created_by uuid,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indents_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT indents_type_chk CHECK (
    indent_type IN ('store_transfer', 'pharmacy_refill', 'emergency')
  ),
  CONSTRAINT indents_priority_chk CHECK (priority IN ('normal', 'urgent', 'stat')),
  CONSTRAINT indents_status_chk CHECK (
    status IN (
      'draft',
      'submitted',
      'approved',
      'partially_approved',
      'rejected',
      'in_fulfillment',
      'fulfilled'
    )
  ),
  CONSTRAINT indents_fulfillment_route_chk CHECK (
    fulfillment_route IN ('stock_transfer', 'procurement')
  ),
  CONSTRAINT indents_distinct_stores_chk CHECK (from_store_id <> to_store_id),
  CONSTRAINT indents_remarks_len_chk CHECK (remarks IS NULL OR char_length(remarks) <= 2000),
  CONSTRAINT indents_reject_len_chk CHECK (
    rejection_reason IS NULL OR char_length(rejection_reason) <= 2000
  ),
  CONSTRAINT indents_date_not_future_chk CHECK (indent_date <= CURRENT_DATE),
  CONSTRAINT indents_purchase_indent_len_chk CHECK (
    purchase_indent_number IS NULL OR char_length(trim(purchase_indent_number)) <= 120
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_indents_tenant_number
  ON inventory.indents (iq_tenant_id, indent_number);

CREATE INDEX IF NOT EXISTS idx_inventory_indents_tenant_status_date
  ON inventory.indents (iq_tenant_id, status, indent_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_indents_tenant_from_store
  ON inventory.indents (iq_tenant_id, from_store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_indents_tenant_to_store
  ON inventory.indents (iq_tenant_id, to_store_id);

CREATE TABLE IF NOT EXISTS inventory.indent_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  indent_id uuid NOT NULL,
  item_id uuid NOT NULL,
  requested_qty numeric(12, 3) NOT NULL,
  approved_qty numeric(12, 3),
  line_remarks text,
  preferred_lot_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indent_lines_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT indent_lines_requested_qty_positive_chk CHECK (requested_qty > 0),
  CONSTRAINT indent_lines_approved_le_requested_chk CHECK (
    approved_qty IS NULL OR approved_qty <= requested_qty
  ),
  CONSTRAINT indent_lines_approved_positive_chk CHECK (
    approved_qty IS NULL OR approved_qty >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_indent_lines_indent
  ON inventory.indent_lines (iq_tenant_id, indent_id, sort_order);

-- ─── Foreign keys (idempotent) ───────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stores_indent_target_store_fk'
  ) THEN
    ALTER TABLE inventory.stores
      ADD CONSTRAINT inventory_stores_indent_target_store_fk
      FOREIGN KEY (iq_tenant_id, indent_target_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_grns_store_fk'
  ) THEN
    ALTER TABLE inventory.grns
      ADD CONSTRAINT inventory_grns_store_fk
      FOREIGN KEY (iq_tenant_id, inventory_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_grn_lines_grn_fk'
  ) THEN
    ALTER TABLE inventory.grn_lines
      ADD CONSTRAINT inventory_grn_lines_grn_fk
      FOREIGN KEY (iq_tenant_id, grn_id)
      REFERENCES inventory.grns (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_grn_lines_item_fk'
  ) THEN
    ALTER TABLE inventory.grn_lines
      ADD CONSTRAINT inventory_grn_lines_item_fk
      FOREIGN KEY (iq_tenant_id, item_id)
      REFERENCES inventory.items (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_lots_item_fk'
  ) THEN
    ALTER TABLE inventory.lots
      ADD CONSTRAINT inventory_lots_item_fk
      FOREIGN KEY (iq_tenant_id, item_id)
      REFERENCES inventory.items (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_lots_store_fk'
  ) THEN
    ALTER TABLE inventory.lots
      ADD CONSTRAINT inventory_lots_store_fk
      FOREIGN KEY (iq_tenant_id, inventory_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_item_fk'
  ) THEN
    ALTER TABLE inventory.stock
      ADD CONSTRAINT inventory_stock_item_fk
      FOREIGN KEY (iq_tenant_id, item_id)
      REFERENCES inventory.items (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_store_fk'
  ) THEN
    ALTER TABLE inventory.stock
      ADD CONSTRAINT inventory_stock_store_fk
      FOREIGN KEY (iq_tenant_id, inventory_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_lot_fk'
  ) THEN
    ALTER TABLE inventory.stock
      ADD CONSTRAINT inventory_stock_lot_fk
      FOREIGN KEY (iq_tenant_id, lot_id)
      REFERENCES inventory.lots (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indents_from_store_fk'
  ) THEN
    ALTER TABLE inventory.indents
      ADD CONSTRAINT inventory_indents_from_store_fk
      FOREIGN KEY (iq_tenant_id, from_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indents_to_store_fk'
  ) THEN
    ALTER TABLE inventory.indents
      ADD CONSTRAINT inventory_indents_to_store_fk
      FOREIGN KEY (iq_tenant_id, to_store_id)
      REFERENCES inventory.stores (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indents_grn_fk'
  ) THEN
    ALTER TABLE inventory.indents
      ADD CONSTRAINT inventory_indents_grn_fk
      FOREIGN KEY (iq_tenant_id, inventory_grn_id)
      REFERENCES inventory.grns (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indent_lines_indent_fk'
  ) THEN
    ALTER TABLE inventory.indent_lines
      ADD CONSTRAINT inventory_indent_lines_indent_fk
      FOREIGN KEY (iq_tenant_id, indent_id)
      REFERENCES inventory.indents (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indent_lines_item_fk'
  ) THEN
    ALTER TABLE inventory.indent_lines
      ADD CONSTRAINT inventory_indent_lines_item_fk
      FOREIGN KEY (iq_tenant_id, item_id)
      REFERENCES inventory.items (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_indent_lines_preferred_lot_fk'
  ) THEN
    ALTER TABLE inventory.indent_lines
      ADD CONSTRAINT inventory_indent_lines_preferred_lot_fk
      FOREIGN KEY (iq_tenant_id, preferred_lot_id)
      REFERENCES inventory.lots (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Citus distribution ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('inventory.stores', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.store_code_sequences', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.item_code_sequences', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.items', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.grns', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.grn_lines', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.lots', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.stock', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.indents', 'iq_tenant_id');
    PERFORM create_distributed_table('inventory.indent_lines', 'iq_tenant_id');
  END IF;
END $$;
