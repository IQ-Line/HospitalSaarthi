-- Partner integration + Smart Report MVP capability seeds (idempotent).

INSERT INTO user_management.capabilities (
  id,
  capability_key,
  module,
  feature,
  action,
  display_name,
  description,
  is_active
)
VALUES
  (
    gen_random_uuid(),
    'integration:partner:provision',
    'integration',
    'partner',
    'provision',
    'Provision partner principal',
    'Create non-loginable partner principal for an integration (Integration Hub orchestration).',
    true
  ),
  (
    gen_random_uuid(),
    'integration:partner:deactivate',
    'integration',
    'partner',
    'deactivate',
    'Deactivate partner principal',
    'Deactivate partner principal when integration is disabled.',
    true
  ),
  (
    gen_random_uuid(),
    'registration:registration:read',
    'registration',
    'registration',
    'read',
    'Read registrations',
    'List and view patient registrations / visits.',
    true
  ),
  (
    gen_random_uuid(),
    'empi:patient:read',
    'empi',
    'patient',
    'read',
    'Read patients',
    'Search and view EMPI patient records.',
    true
  )
ON CONFLICT (capability_key) DO NOTHING;
