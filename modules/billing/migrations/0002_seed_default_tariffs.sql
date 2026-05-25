-- Seed default rack-rate tariffs for every tenant that does not yet have them.
-- Idempotent: ON CONFLICT … DO NOTHING skips tenants already seeded.

INSERT INTO billing.tariff_master
  (iq_tenant_id, service_code, service_name, category, base_price, tax_percentage, is_active)
SELECT
  t.iq_tenant_id,
  v.service_code,
  v.service_name,
  v.category,
  v.base_price,
  v.tax_percentage,
  true
FROM (
  VALUES
    ('REG_FEE',         'Registration Fee',        'Registration', 100.0000, 0.0000),
    ('CONS_GENERAL',    'General Consultation',     'Consultation', 500.0000, 0.0000),
    ('CONS_SPECIALIST', 'Specialist Consultation',  'Consultation', 1000.0000, 0.0000)
) AS v(service_code, service_name, category, base_price, tax_percentage)
CROSS JOIN (
  SELECT DISTINCT iq_tenant_id FROM user_management.users
) AS t
ON CONFLICT (iq_tenant_id, service_code, provider_id) DO NOTHING;
