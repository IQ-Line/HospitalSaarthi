-- Custom SQL migration file, put your code below! --
-- Citus: distribute both record_foundation tenant-scoped tables by iq_tenant_id
-- (the platform distribution key). Every PK/UNIQUE on these tables leads with
-- iq_tenant_id (Citus requirement). bundles relates to care_contexts on the
-- same dist column + type => Citus colocates them automatically (intra-tenant
-- joins stay local). No reference tables in this module.
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed
-- (unlike the old hand-written path).
SELECT create_distributed_table('record_foundation.care_contexts', 'iq_tenant_id');
SELECT create_distributed_table('record_foundation.bundles', 'iq_tenant_id');