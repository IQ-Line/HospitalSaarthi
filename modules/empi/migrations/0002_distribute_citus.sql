-- Custom SQL migration file, put your code below! --
-- Citus: distribute all empi tenant-scoped tables by iq_tenant_id (the platform distribution key).
-- Every PK/UNIQUE on these tables leads with iq_tenant_id (Citus requirement); empi has no cross-table FKs.
-- Same dist column + type => Citus colocates them automatically (intra-tenant joins stay local).
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed (unlike the old hand-written path).
SELECT create_distributed_table('empi.patients', 'iq_tenant_id');
SELECT create_distributed_table('empi.patient_source_records', 'iq_tenant_id');
SELECT create_distributed_table('empi.patient_identifiers', 'iq_tenant_id');
SELECT create_distributed_table('empi.patient_addresses', 'iq_tenant_id');
SELECT create_distributed_table('empi.sequence_counters', 'iq_tenant_id');
SELECT create_distributed_table('empi.match_candidates', 'iq_tenant_id');
SELECT create_distributed_table('empi.merge_history', 'iq_tenant_id');