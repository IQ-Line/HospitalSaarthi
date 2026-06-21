-- Custom SQL migration file, put your code below! --
-- Citus: distribute all billing tenant-scoped tables by iq_tenant_id (the platform distribution key).
-- Every PK on these tables leads with iq_tenant_id (Citus requirement); billing has no cross-table FKs.
-- Same dist column + type => Citus colocates them automatically (intra-tenant joins stay local).
-- No reference tables: tariff_master is tenant-scoped (PK leads with iq_tenant_id), not a global catalog.
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed (unlike the old hand-written path).
SELECT create_distributed_table('billing.tariff_master', 'iq_tenant_id');
SELECT create_distributed_table('billing.bills', 'iq_tenant_id');
SELECT create_distributed_table('billing.bill_items', 'iq_tenant_id');
SELECT create_distributed_table('billing.payments', 'iq_tenant_id');
