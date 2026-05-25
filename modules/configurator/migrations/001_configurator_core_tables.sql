-- Configurator module — organizations & tenants (see modules/configurator/src/schema/tables.ts)

DO $do$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgcrypto extension skipped: %', SQLERRM;
END
$do$;

CREATE SCHEMA IF NOT EXISTS configurator;

CREATE TABLE IF NOT EXISTS configurator.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  contact_email text,
  contact_phone text,
  address text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_organizations_type CHECK (
    type IN (
      'hospital_chain',
      'medical_college',
      'standalone_hospital',
      'government_network'
    )
  ),
  CONSTRAINT chk_organizations_status CHECK (status IN ('active', 'suspended', 'decommissioned'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON configurator.organizations (slug);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON configurator.organizations (status);

CREATE TABLE IF NOT EXISTS configurator.tenants (
  iq_tenant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  parent_tenant_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL,
  provisioning_status text NOT NULL DEFAULT 'provisioning',
  data_isolation_level text NOT NULL DEFAULT 'shared',
  cerbos_scope_key text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  locale text NOT NULL DEFAULT 'en-IN',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_tenants_type CHECK (type IN ('full_platform', 'fragmented', 'lite')),
  CONSTRAINT chk_tenants_provisioning_status CHECK (
    provisioning_status IN ('provisioning', 'active', 'suspended', 'decommissioned')
  ),
  CONSTRAINT chk_tenants_data_isolation_level CHECK (data_isolation_level IN ('shared', 'isolated'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON configurator.tenants (slug);

CREATE INDEX IF NOT EXISTS idx_tenants_org ON configurator.tenants (org_id);

CREATE INDEX IF NOT EXISTS idx_tenants_parent ON configurator.tenants (parent_tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON configurator.tenants (provisioning_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_cerbos_scope ON configurator.tenants (cerbos_scope_key);
