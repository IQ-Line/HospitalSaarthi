-- Branch / site columns on configurator.tenants (child tenants under root default tenant).

ALTER TABLE configurator.tenants
  ADD COLUMN IF NOT EXISTS branch_code text,
  ADD COLUMN IF NOT EXISTS branch_type text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;

DO $$
BEGIN
  ALTER TABLE configurator.tenants
    ADD CONSTRAINT chk_tenants_branch_type CHECK (
      branch_type IS NULL
      OR branch_type IN ('hub_lab', 'hub', 'satellite')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_org_branch_code
  ON configurator.tenants (org_id, branch_code)
  WHERE branch_code IS NOT NULL;
