-- Enforce one active registration fee per tenant and one active tariff per doctor+department.

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_active_registration_fee
  ON billing.tariff_master (iq_tenant_id)
  WHERE is_active = true
    AND provider_id IS NULL
    AND lower(category) IN ('registration-fee', 'registration');

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_provider_department
  ON billing.tariff_master (iq_tenant_id, provider_id, department_id)
  WHERE is_active = true
    AND provider_id IS NOT NULL
    AND department_id IS NOT NULL;
