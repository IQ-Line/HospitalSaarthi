-- Dev tariff seed for visit registration (REG_FEE + CONS_GENERAL rack rates).
-- Tenant matches UM development bootstrap + web login (login.tsx DEV_TENANT_ID).
-- Idempotent: safe to re-run on every `nx run billing:db-migrate`.

INSERT INTO billing.tariff_master (
  iq_tenant_id,
  service_code,
  service_name,
  description,
  provider_id,
  department,
  category,
  tax_type,
  base_price,
  tax_percentage,
  is_active
)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'REG_FEE',
    'Registration Fee',
    'First visit registration',
    NULL,
    'frontdesk',
    'registration',
    'EXEMPT',
    100.0000,
    0.0000,
    true
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'CONS_GENERAL',
    'General Consultation (rack)',
    NULL,
    NULL,
    'opd',
    'consultation',
    'CGST_SGST',
    400.0000,
    0.0000,
    true
  )
ON CONFLICT (iq_tenant_id, service_code, provider_id) DO NOTHING;
