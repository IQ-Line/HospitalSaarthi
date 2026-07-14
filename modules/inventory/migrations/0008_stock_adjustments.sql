-- Stock adjustment audit trail (PH6-style delta adjustments at lot/stock row level).

CREATE TABLE IF NOT EXISTS inventory.stock_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  stock_id uuid NOT NULL,
  item_id uuid NOT NULL,
  inventory_store_id uuid NOT NULL,
  lot_id uuid,
  delta numeric(12, 3) NOT NULL,
  quantity_before numeric(12, 3) NOT NULL,
  quantity_after numeric(12, 3) NOT NULL,
  reason text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_adjustments_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT stock_adjustments_delta_nonzero_chk CHECK (delta <> 0),
  CONSTRAINT stock_adjustments_quantity_after_nonneg_chk CHECK (quantity_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_adjustments_tenant_store_created
  ON inventory.stock_adjustments (iq_tenant_id, inventory_store_id, created_at DESC);

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('inventory.stock_adjustments', 'iq_tenant_id');
  END IF;
END $$;
