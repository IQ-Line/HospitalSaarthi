-- Reinforce tenant ↔ organisation relationship (org_id and parent_tenant_id already exist from 001).

DO $$
BEGIN
  ALTER TABLE configurator.tenants
    ADD CONSTRAINT fk_tenants_organization
    FOREIGN KEY (org_id) REFERENCES configurator.organizations (id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE configurator.tenants
    ADD CONSTRAINT fk_tenants_parent_tenant
    FOREIGN KEY (parent_tenant_id) REFERENCES configurator.tenants (iq_tenant_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN configurator.tenants.org_id IS
  'Owning organisation; every tenant belongs to exactly one organisation';
COMMENT ON COLUMN configurator.tenants.parent_tenant_id IS
  'Parent tenant within the same org (NULL = root tenant; branches reference a root tenant)';
