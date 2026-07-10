-- Custom SQL migration file, put your code below! --
-- Citus: distribute all pharmacy tenant-scoped tables by iq_tenant_id (the platform distribution key).
-- Every PK/UNIQUE on these tables leads with iq_tenant_id (Citus requirement); the only FK
-- (dispense_line_items -> dispense) is intra-schema and leads with iq_tenant_id.
-- Same dist column + type => Citus colocates them automatically (intra-tenant FKs/joins stay local).
-- Parent tables are distributed before children so the FK constraints resolve against
-- already-distributed refs. Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed.
SELECT create_distributed_table('pharmacy.dispense', 'iq_tenant_id');
SELECT create_distributed_table('pharmacy.dispense_line_items', 'iq_tenant_id');
SELECT create_distributed_table('pharmacy.queue_projection', 'iq_tenant_id');
