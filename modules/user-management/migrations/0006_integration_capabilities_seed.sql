-- Integration Hub control-plane runtime capabilities (ADR-0032 PR-1).
-- Idempotent upsert by capability_key. Partner-exposed keys included when absent.

INSERT INTO user_management.capabilities (
  id,
  capability_key,
  module,
  feature,
  action,
  display_name,
  description,
  is_active,
  source_module_slug,
  source_permission_slug,
  source_catalog,
  created_at,
  updated_at
)
VALUES
  (gen_random_uuid(), 'integration:integration:read', 'integration', 'integration', 'read', 'Read integrations', 'Integration Hub — list and view integrations', true, 'integration', 'integration.read', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:integration:create', 'integration', 'integration', 'create', 'Create integrations', 'Integration Hub — create draft integrations', true, 'integration', 'integration.create', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:integration:update', 'integration', 'integration', 'update', 'Update integrations', 'Integration Hub — update integration configuration', true, 'integration', 'integration.update', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:integration:delete', 'integration', 'integration', 'delete', 'Delete integrations', 'Integration Hub — delete draft integrations', true, 'integration', 'integration.delete', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:integration:activate', 'integration', 'integration', 'activate', 'Activate integrations', 'Integration Hub — activate integrations and provision partner principals', true, 'integration', 'integration.activate', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:integration:disable', 'integration', 'integration', 'disable', 'Disable integrations', 'Integration Hub — disable integrations and revoke keys', true, 'integration', 'integration.disable', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:integration:reactivate', 'integration', 'integration', 'reactivate', 'Reactivate integrations', 'Integration Hub — reactivate disabled integrations', true, 'integration', 'integration.reactivate', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:api-key:read', 'integration', 'api-key', 'read', 'Read API keys', 'Integration Hub — list integration API keys', true, 'integration', 'api-key.read', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:api-key:issue', 'integration', 'api-key', 'issue', 'Issue API keys', 'Integration Hub — issue integration API keys', true, 'integration', 'api-key.issue', 'master_data', now(), now()),
  (gen_random_uuid(), 'integration:api-key:revoke', 'integration', 'api-key', 'revoke', 'Revoke API keys', 'Integration Hub — revoke integration API keys', true, 'integration', 'api-key.revoke', 'master_data', now(), now()),
  (gen_random_uuid(), 'registration:registration:read', 'registration', 'registration', 'read', 'Read registrations', 'Registration desk — list registrations (partner-exposed)', true, 'registration', 'read', 'master_data', now(), now()),
  (gen_random_uuid(), 'empi:patient:read', 'empi', 'patient', 'read', 'Read patients', 'EMPI — read patient record (partner-exposed)', true, 'empi', 'empi.patient.read', 'master_data', now(), now())
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  feature = EXCLUDED.feature,
  action = EXCLUDED.action,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = true,
  source_module_slug = EXCLUDED.source_module_slug,
  source_permission_slug = EXCLUDED.source_permission_slug,
  source_catalog = EXCLUDED.source_catalog,
  updated_at = now();
