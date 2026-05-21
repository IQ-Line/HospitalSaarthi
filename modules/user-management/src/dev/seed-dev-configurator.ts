import { createDb, sql } from "@hims/ts-sdk-db";
import {
  DEVELOPMENT_BOOTSTRAP_ORG_SLUG,
  DEVELOPMENT_BOOTSTRAP_TENANT_SLUG,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_SEED_TENANT_ID,
} from "../../../../packages/dev-bootstrap/src/index.js";

const DEV_ORG_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d481";
const DEV_TENANT_ID = DEVELOPMENT_SEED_TENANT_ID;

function normalizePostgresUrl(url: string): string {
  return url.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

export type DevConfiguratorSeedResult = {
  tenant_modules: number;
};

/** Dev tenant, org, and L1 catalog module enablement (idempotent). */
export async function seedDevConfigurator(
  databaseUrl: string,
  moduleIdsBySlug: Map<string, string>,
): Promise<DevConfiguratorSeedResult> {
  const db = createDb(normalizePostgresUrl(databaseUrl));
  let tenantModuleCount = 0;

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`
      INSERT INTO configurator.organizations (
        id, name, slug, type, status, contact_email, metadata, created_at, updated_at
      )
      VALUES (
        '${DEV_ORG_ID}'::uuid,
        'Hospital Saarthi Dev Org',
        '${DEVELOPMENT_BOOTSTRAP_ORG_SLUG}',
        'standalone_hospital',
        'active',
        '${DEVELOPMENT_BOOTSTRAP_USER_EMAIL}',
        '{"seed":"platform-data-bootstrap"}'::jsonb,
        now(),
        now()
      )
      ON CONFLICT (id) DO NOTHING
    `));

    await tx.execute(sql.raw(`
      INSERT INTO configurator.tenants (
        iq_tenant_id, org_id, parent_tenant_id, name, slug, type,
        provisioning_status, data_isolation_level, cerbos_scope_key,
        timezone, locale, metadata, created_at, updated_at
      )
      VALUES (
        '${DEV_TENANT_ID}'::uuid,
        '${DEV_ORG_ID}'::uuid,
        NULL,
        'Dev Hospital',
        '${DEVELOPMENT_BOOTSTRAP_TENANT_SLUG}',
        'full_platform',
        'active',
        'shared',
        '${DEV_TENANT_ID}',
        'Asia/Kolkata',
        'en-IN',
        '{"seed":"platform-data-bootstrap"}'::jsonb,
        now(),
        now()
      )
      ON CONFLICT (iq_tenant_id) DO NOTHING
    `));

    for (const moduleId of moduleIdsBySlug.values()) {
      await tx.execute(sql.raw(`
        INSERT INTO configurator.tenant_modules (
          iq_tenant_id, module_id, is_active, is_core_override, created_at, updated_at
        )
        VALUES (
          '${DEV_TENANT_ID}'::uuid,
          '${moduleId}'::uuid,
          true,
          false,
          now(),
          now()
        )
        ON CONFLICT (iq_tenant_id, module_id) DO UPDATE
        SET is_active = true, is_core_override = false, updated_at = now()
      `));
      tenantModuleCount += 1;
    }
  });

  return { tenant_modules: tenantModuleCount };
}
