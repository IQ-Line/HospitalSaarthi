-- Billing schema — Phase 1 catalog table.
-- ERD source: docs/architecture/lld/billing/billing.phase-1.erd.json (`service_master`)
-- Implemented table name: billing.tariff_master (tenant-scoped chargeable-service catalog).
--
-- Apply:
--   psql "$DATABASE_URL" -f modules/billing/migrations/0000_billing_master.sql
--
-- Requires PostgreSQL 15+ (NULLS NOT DISTINCT on unique index for provider_id).

CREATE SCHEMA IF NOT EXISTS billing;

-- ─── tariff_master (ERD: service_master) ───────────────────────────────────────
-- One row per (service_code, provider_id). provider_id NULL = rack rate;
-- NOT NULL = doctor-specific consultation pricing. Inactive rows are retained.
CREATE TABLE IF NOT EXISTS billing.tariff_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  service_code varchar(64) NOT NULL,
  service_name text NOT NULL,
  description text,
  provider_id uuid,
  department varchar(64),
  category varchar(64),
  sub_category varchar(64),
  tax_type text,
  base_price numeric(18, 4) NOT NULL,
  tax_percentage numeric(7, 4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT tariff_master_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT tariff_master_base_price_nonneg_chk CHECK (base_price >= 0),
  CONSTRAINT tariff_master_tax_percentage_range_chk CHECK (
    tax_percentage >= 0 AND tax_percentage <= 100
  ),
  CONSTRAINT tariff_master_effective_range_chk CHECK (
    effective_to IS NULL OR effective_to > effective_from
  )
);

-- At most one rack-rate row per service_code (NULL provider_id) and one row per
-- (service_code, provider_id) when provider_id is set (PG15+ NULLS NOT DISTINCT).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_tenant_code_provider
  ON billing.tariff_master (iq_tenant_id, service_code, provider_id)
  NULLS NOT DISTINCT;

-- Counter UI: active services by category.
CREATE INDEX IF NOT EXISTS idx_tariff_master_tenant_active_category
  ON billing.tariff_master (iq_tenant_id, is_active, category);

-- Frontdesk: consultations offered by a specific provider.
CREATE INDEX IF NOT EXISTS idx_tariff_master_tenant_provider_active
  ON billing.tariff_master (iq_tenant_id, provider_id, is_active)
  WHERE provider_id IS NOT NULL;

-- Autocomplete on service_name.
CREATE INDEX IF NOT EXISTS idx_tariff_master_tenant_service_name
  ON billing.tariff_master (iq_tenant_id, service_name text_pattern_ops);

-- Charge resolution: active row for (service_code, provider_id) at a point in time.
CREATE INDEX IF NOT EXISTS idx_tariff_master_tenant_code_provider_effective
  ON billing.tariff_master (iq_tenant_id, service_code, provider_id, effective_from DESC)
  WHERE is_active = true;

-- Citus (run only when HIMS_CITUS_ENABLED=true):
--   SELECT create_distributed_table('billing.tariff_master', 'iq_tenant_id');
