-- Custom SQL migration file, put your code below! --
-- Citus: distribute the scan-and-share tables by iq_tenant_id (the platform distribution key),
-- matching the other integration_hub tables (see 0001_distribute_citus).
-- Both are tenant-scoped, their PK leads with iq_tenant_id, and they hold no cross-table FKs;
-- same dist column + type means Citus colocates them with the rest of the schema automatically.
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed.
SELECT create_distributed_table('integration_hub.abdm_share_tokens', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_share_token_issuances', 'iq_tenant_id');