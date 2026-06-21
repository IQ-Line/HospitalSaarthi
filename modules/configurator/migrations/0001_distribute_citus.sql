-- Custom SQL migration file, put your code below! --
-- Citus classification for the `configurator` control-plane module.
--
-- REFERENCE tables (replicated to every node — single logical row per entity across all
-- tenants; FK-referenced by distributed/other reference tables):
--   * organizations            — cross-tenant org registry; FK target of tenants.org_id.
--   * tenants                  — the tenant registry itself (PK = single iq_tenant_id column,
--                                NOT a per-tenant shard key); FK target of sequence_configuration
--                                and (logically) the api-key/integration-profile tables.
--   * tenant_integration_profiles, tenant_api_keys, sequence_configuration
--                                — per-tenant config whose PK is a surrogate id (id/api_key_id)
--                                or single iq_tenant_id and therefore does NOT lead a composite
--                                tenant shard key; Citus requires the distribution column to be
--                                part of every PK/UNIQUE, so these cannot be hash-distributed
--                                without restructuring their PKs. They reference tenants(iq_tenant_id),
--                                a reference-to-reference FK, which Citus allows.
--
-- DISTRIBUTED tables (hash-sharded by iq_tenant_id — composite PK leads with iq_tenant_id):
--   * tenant_modules           — PK (iq_tenant_id, module_id); no FKs, so it shards cleanly.
--
-- Order: create_reference_table(...) for FK targets first (organizations before tenants;
-- tenants before its dependents) so reference-to-reference FKs resolve, THEN distribute.
-- Journaled => runs exactly once; no DO $$ / pg_dist_partition guard needed.

SELECT create_reference_table('configurator.organizations');
SELECT create_reference_table('configurator.tenants');
SELECT create_reference_table('configurator.tenant_integration_profiles');
SELECT create_reference_table('configurator.tenant_api_keys');
SELECT create_reference_table('configurator.sequence_configuration');
SELECT create_distributed_table('configurator.tenant_modules', 'iq_tenant_id');