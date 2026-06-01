-- Department-aware provider consultation tariffs.
-- Extends tariff_master; adds consultation_types catalog.

CREATE TABLE IF NOT EXISTS billing.consultation_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  code varchar(64) NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultation_types_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT consultation_types_tenant_code_unique UNIQUE (iq_tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_consultation_types_tenant_active
  ON billing.consultation_types (iq_tenant_id, is_active);

ALTER TABLE billing.tariff_master
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS consultation_type_id uuid;

-- Replace single uniqueness index with partial indexes (rack, legacy provider, department consultation).
DROP INDEX IF EXISTS billing.uq_tariff_master_tenant_code_provider;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_rack_code
  ON billing.tariff_master (iq_tenant_id, service_code, provider_id)
  WHERE provider_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_legacy_provider_code
  ON billing.tariff_master (iq_tenant_id, service_code, provider_id)
  WHERE provider_id IS NOT NULL
    AND department_id IS NULL
    AND consultation_type_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_provider_consultation
  ON billing.tariff_master (iq_tenant_id, provider_id, department_id, consultation_type_id)
  WHERE provider_id IS NOT NULL
    AND department_id IS NOT NULL
    AND consultation_type_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tariff_master_provider_consultation_lookup
  ON billing.tariff_master (
    iq_tenant_id,
    provider_id,
    department_id,
    consultation_type_id,
    effective_from DESC
  )
  WHERE is_active = true
    AND provider_id IS NOT NULL
    AND department_id IS NOT NULL
    AND consultation_type_id IS NOT NULL;
