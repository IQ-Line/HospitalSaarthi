-- Custom SQL migration file, put your code below! --
-- Citus: distribute all inventory tenant-scoped tables by iq_tenant_id (the platform
-- distribution key). Every PK/UNIQUE on these tables leads with iq_tenant_id (Citus
-- requirement) and every intra-schema FK leads with iq_tenant_id.
-- Parent tables are distributed before children so FK constraints resolve against
-- already-distributed refs (stores → items → grns/lots → stock/grn_lines → indents →
-- indent_lines → stock_transfers → stock_transfer_lines).
-- Same dist column + type => Citus colocates them automatically (intra-tenant FKs/joins stay local).
-- The two cyclic FKs (grns→indents, indents→stock_transfers) are added AFTER distribution
-- in 0002 — see that migration's header for why they can't live in tables.ts.
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed.
SELECT create_distributed_table('inventory.stores', 'iq_tenant_id');
SELECT create_distributed_table('inventory.store_code_sequences', 'iq_tenant_id');
SELECT create_distributed_table('inventory.item_code_sequences', 'iq_tenant_id');
SELECT create_distributed_table('inventory.indent_sequences', 'iq_tenant_id');
SELECT create_distributed_table('inventory.stock_transfer_sequences', 'iq_tenant_id');
SELECT create_distributed_table('inventory.items', 'iq_tenant_id');
SELECT create_distributed_table('inventory.grns', 'iq_tenant_id');
SELECT create_distributed_table('inventory.grn_lines', 'iq_tenant_id');
SELECT create_distributed_table('inventory.lots', 'iq_tenant_id');
SELECT create_distributed_table('inventory.stock', 'iq_tenant_id');
SELECT create_distributed_table('inventory.indents', 'iq_tenant_id');
SELECT create_distributed_table('inventory.indent_lines', 'iq_tenant_id');
SELECT create_distributed_table('inventory.stock_transfers', 'iq_tenant_id');
SELECT create_distributed_table('inventory.stock_transfer_lines', 'iq_tenant_id');