-- Custom SQL migration file, put your code below! --
-- Citus: distribute all integration_hub tables by iq_tenant_id (the platform distribution key).
-- Every table is tenant-scoped and its PK leads with iq_tenant_id (Citus requirement).
-- No reference tables and no cross-table FKs in this schema, so there is no
-- reference-before-distributed ordering constraint; same dist column + type means
-- Citus colocates them automatically (intra-tenant joins stay local).
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed
-- (unlike the old hand-written "re-run every .sql on boot" path).
SELECT create_distributed_table('integration_hub.abdm_sessions', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_inbound_messages', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_link_tokens', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_linked_care_contexts', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_link_otps', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_m3_consent_requests', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_m3_consent_artefacts_hiu', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_m3_data_transfers', 'iq_tenant_id');
SELECT create_distributed_table('integration_hub.abdm_consent_artefacts', 'iq_tenant_id');