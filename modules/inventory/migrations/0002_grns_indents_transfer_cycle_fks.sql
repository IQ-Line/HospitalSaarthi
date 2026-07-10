-- Custom SQL migration file, put your code below! --
-- The two FK cycles the legacy hand-written SQL carried (0002_inventory_enhancements +
-- 0004_inventory_stock_transfers):
--   grns.inventory_indent_id            → indents  (while indents.inventory_grn_id → grns)
--   indents.inventory_stock_transfer_id → stock_transfers  (while stock_transfers.inventory_indent_id → indents)
-- They cannot be declared in src/schema/tables.ts: each pair is a declaration-order cycle
-- (the referenced table const does not exist yet at module-evaluation time), so they live
-- here as a journaled custom migration. Both sides are already distributed by iq_tenant_id
-- (0001) and each FK leads with the distribution key, so Citus accepts them (colocated).
-- NOTE: the legacy SQL used ON DELETE SET NULL, which Citus rejects when the distribution
-- key is part of the FK (EnsureSupportedFKeyOnDistKey) — NO ACTION is the closest allowed
-- behaviour (same applies to the four SET NULL FKs ported into tables.ts).
-- Journaled => runs exactly once; no IF NOT EXISTS guards needed.
ALTER TABLE inventory.grns
  ADD CONSTRAINT inventory_grns_indent_fk
  FOREIGN KEY (iq_tenant_id, inventory_indent_id)
  REFERENCES inventory.indents (iq_tenant_id, id)
  ON DELETE NO ACTION;
--> statement-breakpoint
ALTER TABLE inventory.indents
  ADD CONSTRAINT inventory_indents_stock_transfer_fk
  FOREIGN KEY (iq_tenant_id, inventory_stock_transfer_id)
  REFERENCES inventory.stock_transfers (iq_tenant_id, id)
  ON DELETE NO ACTION;