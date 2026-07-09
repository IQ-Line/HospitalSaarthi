-- Custom SQL migration file, put your code below! --
-- Citus: distribute the new stock_transfer_allocations table by iq_tenant_id, colocated with
-- the rest of the inventory schema (same dist column + type => automatic colocation, so the
-- allocation writes stay local to the tenant shard). PK leads with iq_tenant_id (Citus requirement).
-- The FK to stock_transfer_lines is added AFTER distribution: stock_transfer_lines was already
-- distributed in 0001, and Citus rejects a FK from a still-local table to an already-distributed
-- parent — the same reason the cyclic FKs are deferred to 0002. Once both are distributed and
-- colocated the constraint is accepted. Journaled => runs exactly once.
SELECT create_distributed_table('inventory.stock_transfer_allocations', 'iq_tenant_id');
--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_allocations" ADD CONSTRAINT "inventory_stock_transfer_allocations_line_fk" FOREIGN KEY ("iq_tenant_id","stock_transfer_line_id") REFERENCES "inventory"."stock_transfer_lines"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;
