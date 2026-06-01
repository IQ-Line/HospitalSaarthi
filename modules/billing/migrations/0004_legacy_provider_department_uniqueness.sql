-- Legacy Tariff Master rows (no department_id) were unique on (service_code, provider_id),
-- blocking the same doctor in multiple departments. Scope uniqueness to doctor + department label.

DROP INDEX IF EXISTS billing.uq_tariff_master_legacy_provider_code;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_legacy_provider_department
  ON billing.tariff_master (iq_tenant_id, provider_id, lower(trim(department)))
  WHERE provider_id IS NOT NULL
    AND department_id IS NULL
    AND consultation_type_id IS NULL
    AND department IS NOT NULL
    AND trim(department) <> '';
