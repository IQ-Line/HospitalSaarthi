import type { DbInstance } from "@hims/ts-sdk-db";
import { eq } from "@hims/ts-sdk-db";
import { organizations, tenants } from "@hims/configurator";
import {
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_BOOTSTRAP_ORG_SLUG,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_SLUG,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  shouldRunPlatformDevelopmentBootstrap,
} from "@hims/dev-bootstrap";

export { shouldRunPlatformDevelopmentBootstrap as shouldRunDevelopmentBootstrap };

export type ConfiguratorDevelopmentBootstrapResult = {
  orgId: string;
  tenantId: string;
  tenantModuleIds: string[];
};

async function ensureBootstrapOrganization(db: DbInstance): Promise<void> {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, DEVELOPMENT_BOOTSTRAP_ORG_ID))
    .limit(1);

  if (existing) {
    await db
      .update(organizations)
      .set({
        name: "Hospital Saarthi Dev Org",
        slug: DEVELOPMENT_BOOTSTRAP_ORG_SLUG,
        type: "standalone_hospital",
        status: "active",
        contact_email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
        updated_at: new Date(),
      })
      .where(eq(organizations.id, DEVELOPMENT_BOOTSTRAP_ORG_ID));
    return;
  }

  await db.insert(organizations).values({
    id: DEVELOPMENT_BOOTSTRAP_ORG_ID,
    name: "Hospital Saarthi Dev Org",
    slug: DEVELOPMENT_BOOTSTRAP_ORG_SLUG,
    type: "standalone_hospital",
    status: "active",
    contact_email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
    metadata: { seed: "configurator-development-bootstrap" },
  });
}

async function ensureBootstrapTenant(db: DbInstance): Promise<void> {
  const [existing] = await db
    .select({ iq_tenant_id: tenants.iq_tenant_id })
    .from(tenants)
    .where(eq(tenants.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID))
    .limit(1);

  if (existing) {
    await db
      .update(tenants)
      .set({
        org_id: DEVELOPMENT_BOOTSTRAP_ORG_ID,
        name: "Dev Hospital",
        slug: DEVELOPMENT_BOOTSTRAP_TENANT_SLUG,
        type: "full_platform",
        provisioning_status: "active",
        data_isolation_level: "shared",
        cerbos_scope_key: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        updated_at: new Date(),
      })
      .where(eq(tenants.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID));
    return;
  }

  await db.insert(tenants).values({
    iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    org_id: DEVELOPMENT_BOOTSTRAP_ORG_ID,
    parent_tenant_id: null,
    name: "Dev Hospital",
    slug: DEVELOPMENT_BOOTSTRAP_TENANT_SLUG,
    type: "full_platform",
    provisioning_status: "active",
    data_isolation_level: "shared",
    cerbos_scope_key: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    metadata: { seed: "configurator-development-bootstrap" },
  });
}

async function ensureBootstrapTenantModules(): Promise<string[]> {
  // Tenant module enablement is owned by `make seed` (Configurator seed), not service bootstrap.
  return [];
}

export async function runConfiguratorDevelopmentBootstrap(
  db: DbInstance,
): Promise<ConfiguratorDevelopmentBootstrapResult> {
  await ensureBootstrapOrganization(db);
  await ensureBootstrapTenant(db);
  const tenantModuleIds = await ensureBootstrapTenantModules();

  return {
    orgId: DEVELOPMENT_BOOTSTRAP_ORG_ID,
    tenantId: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    tenantModuleIds,
  };
}
