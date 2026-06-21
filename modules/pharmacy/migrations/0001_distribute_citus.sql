-- Custom SQL migration file, put your code below! --
-- Citus: distribute all pharmacy tenant-scoped tables by iq_tenant_id (the platform distribution key).
-- Every PK on these tables leads with iq_tenant_id (Citus requirement); the two FKs are intra-schema
-- (dispense_records -> walk_in_patients, dispense_line_items -> dispense_records) and lead with iq_tenant_id.
-- Same dist column + type => Citus colocates them automatically (intra-tenant FKs/joins stay local).
-- Parent tables are distributed before children so the FK constraints resolve against already-distributed refs.
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed (unlike the old hand-written path).
SELECT create_distributed_table('pharmacy.walk_in_patients', 'iq_tenant_id');
SELECT create_distributed_table('pharmacy.dispense_records', 'iq_tenant_id');
SELECT create_distributed_table('pharmacy.dispense_line_items', 'iq_tenant_id');
SELECT create_distributed_table('pharmacy.opd_queue_projection', 'iq_tenant_id');
