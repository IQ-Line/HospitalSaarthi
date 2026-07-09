-- Operational enhancements on top of 0000 + 0001.
--
-- Stores:   central (procurement) store flag — at most one per tenant
-- Indents:  fulfillment_route (PR | stock_transfer) stays separate from indent_type
--           (store_transfer | pharmacy_refill | emergency); to_store optional for PR
-- GRNs:     optional link to a procurement indent
--
-- Idempotent: safe to run on every dev boot.

-- ─── Central store ───────────────────────────────────────────────────────────

ALTER TABLE inventory.stores
  ADD COLUMN IF NOT EXISTS is_central_store boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_stores_tenant_central_store
  ON inventory.stores (iq_tenant_id)
  WHERE is_central_store = true;

-- ─── Indents: PR fulfillment has no destination store ────────────────────────

ALTER TABLE inventory.indents DROP CONSTRAINT IF EXISTS indents_distinct_stores_chk;

ALTER TABLE inventory.indents
  ALTER COLUMN to_store_id DROP NOT NULL;

ALTER TABLE inventory.indents
  ADD CONSTRAINT indents_distinct_stores_chk CHECK (
    to_store_id IS NULL OR from_store_id <> to_store_id
  );

-- ─── GRN → procurement indent (optional) ─────────────────────────────────────

ALTER TABLE inventory.grns
  ADD COLUMN IF NOT EXISTS inventory_indent_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_grns_indent_fk'
  ) THEN
    ALTER TABLE inventory.grns
      ADD CONSTRAINT inventory_grns_indent_fk
      FOREIGN KEY (iq_tenant_id, inventory_indent_id)
      REFERENCES inventory.indents (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_grns_tenant_indent
  ON inventory.grns (iq_tenant_id, inventory_indent_id)
  WHERE inventory_indent_id IS NOT NULL;
