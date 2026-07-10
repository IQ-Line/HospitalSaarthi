-- Custom SQL migration file, put your code below! --
-- Citus: distribute all registration tenant-scoped tables by iq_tenant_id (the platform distribution key).
-- Both tables' PK leads with iq_tenant_id (Citus requirement); registration has no cross-table FKs and no reference tables.
-- Same dist column + type => Citus colocates them automatically (intra-tenant joins stay local).
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed (unlike the old hand-written path).
SELECT create_distributed_table('registration.registration', 'iq_tenant_id');
SELECT create_distributed_table('registration.visit', 'iq_tenant_id');
