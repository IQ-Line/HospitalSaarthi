import { and, eq, sql } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createDb } from "@hims/ts-sdk-db";
import {
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_PLATFORM_OPERATOR,
  DEVELOPMENT_SEED_TENANT_ID,
  DEVELOPMENT_SEED_USERS,
} from "@hims/dev-bootstrap";
// Dev-only seed glue: this composes the module's data with the better-auth user table, which
// is correctly owned by the service-layer auth adapter (ADR-0003). A module importing its own
// service is the inverse of the layer rule, but the clean fix (extract a shared dev-seed package,
// or relocate dev composition to the service without leaking dev-only internals into the module's
// public API) is an authn-layering change tracked with the deferred Token-Handler work. This path
// never runs in production. Gate: cleanup follow-up "dev-seed module→service composition".
// eslint-disable-next-line @nx/enforce-module-boundaries -- see comment above (dev-only, gated)
import { authUser } from "../../../../services/user-management-svc/src/auth/auth-schema.js";
import { capabilities, roles, user_roles, users } from "../schema/tables.js";
import { resolveMasterDataModuleCatalog } from "./resolve-master-data-module-catalog.js";
import { seedDevConfigurator } from "./seed-dev-configurator.js";
import { syncCapabilitiesFromMasterDataCatalog } from "./sync-capabilities-from-master-data-catalog.js";
import { syncSuperAdminCapabilitySnapshots } from "./sync-super-admin-capability-snapshots.js";

const DEV_TENANT_ID = DEVELOPMENT_SEED_TENANT_ID;
const DEV_ORG_ID = DEVELOPMENT_BOOTSTRAP_ORG_ID;

export type PlatformDataBootstrapAuthEnv = {
  authBaseUrl: string;
  secret: string;
  jwtIssuer: string;
  jwtAudience: string;
};

export type PlatformDataBootstrapResult = {
  catalog_modules: number;
  tenant_modules: number;
  capabilities_synced: number;
  super_admin_capabilities: number;
};

type BetterAuthServerApi = {
  api: {
    signUpEmail(args: {
      body: {
        email: string;
        iq_tenant_id: string;
        name: string;
        password: string;
        platform_user_id: string;
        username: string;
      };
    }): Promise<unknown>;
  };
};

function normalizePostgresUrl(url: string): string {
  return url.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

async function schemaExists(db: DbInstance, schema: string): Promise<boolean> {
  const result = await db.execute(sql.raw(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = '${schema}'
    ) AS exists
  `));
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: Array<Record<string, unknown>> }).rows ?? []);
  const exists = rows[0]?.exists;
  return exists === true || exists === "t";
}

async function ensureSuperAdminRole(db: DbInstance): Promise<string> {
  const seedUser = DEVELOPMENT_PLATFORM_OPERATOR;
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.iq_tenant_id, DEV_TENANT_ID), eq(roles.code, seedUser.roleCode)))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  await db.insert(roles).values({
    iq_tenant_id: DEV_TENANT_ID,
    id: seedUser.roleId,
    code: seedUser.roleCode,
    role_type: seedUser.roleCode,
    display_name: seedUser.name,
    description: "Platform super-admin (all catalog capabilities).",
    is_system: true,
    status: "active",
  });

  return seedUser.roleId;
}

async function ensureSuperAdminPlatformUser(db: DbInstance): Promise<string> {
  const seedUser = DEVELOPMENT_PLATFORM_OPERATOR;
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.iq_tenant_id, DEV_TENANT_ID), eq(users.email, seedUser.email)))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        full_name: seedUser.name,
        username: seedUser.username,
        org_id: DEV_ORG_ID,
        status: "active",
        updated_at: new Date(),
      })
      .where(and(eq(users.iq_tenant_id, DEV_TENANT_ID), eq(users.id, existing.id)));
    return existing.id;
  }

  await db.insert(users).values({
    iq_tenant_id: DEV_TENANT_ID,
    id: seedUser.userId,
    full_name: seedUser.name,
    email: seedUser.email,
    username: seedUser.username,
    org_id: DEV_ORG_ID,
    status: "active",
  });

  return seedUser.userId;
}

async function ensureSuperAdminAuthUser(
  db: DbInstance,
  auth: BetterAuthSignUpApi,
  platformUserId: string,
): Promise<string> {
  const seedUser = DEVELOPMENT_PLATFORM_OPERATOR;
  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, seedUser.email))
    .limit(1);

  if (existing) {
    await db
      .update(authUser)
      .set({
        username: seedUser.username,
        displayUsername: seedUser.username,
        updatedAt: new Date(),
      })
      .where(eq(authUser.id, existing.id));
    return existing.id;
  }

  await auth.api.signUpEmail({
    body: {
      name: seedUser.name,
      email: seedUser.email,
      password: seedUser.password,
      iq_tenant_id: DEV_TENANT_ID,
      platform_user_id: platformUserId,
      username: seedUser.username,
    },
  });

  const [created] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, seedUser.email))
    .limit(1);

  if (!created) {
    throw new Error(`better-auth user was not created for ${seedUser.email}`);
  }
  return created.id;
}

/**
 * Idempotent dev platform bootstrap: Master Data capabilities → Configurator tenant → super-admin.
 * Invoked from `scripts/apply-migration.ts` after SQL migrations.
 */
export async function applyPlatformDataBootstrap(input: {
  databaseUrl: string;
  masterDataDatabaseUrl: string;
  auth?: PlatformDataBootstrapAuthEnv;
}): Promise<PlatformDataBootstrapResult> {
  const db = createDb(normalizePostgresUrl(input.databaseUrl));

  if (!(await schemaExists(db, "master_global"))) {
    throw new Error('Schema "master_global" not found — run master-data migrations first');
  }
  if (!(await schemaExists(db, "configurator"))) {
    throw new Error('Schema "configurator" not found — run configurator migrations first');
  }
  if (!(await schemaExists(db, "user_management"))) {
    throw new Error('Schema "user_management" not found — run user-management SQL migrations first');
  }

  const catalog = await resolveMasterDataModuleCatalog(input.masterDataDatabaseUrl);
  const cfg = await seedDevConfigurator(input.databaseUrl, catalog.moduleIdsBySlug);

  const sync = await syncCapabilitiesFromMasterDataCatalog(db, input.masterDataDatabaseUrl);
  if (sync.inserted + sync.updated === 0) {
    throw new Error(
      "No capabilities synced from Master Data — ensure master-data migrations and catalog seeds ran",
    );
  }

  const roleId = await ensureSuperAdminRole(db);
  const platformUserId = await ensureSuperAdminPlatformUser(db);

  await db
    .insert(user_roles)
    .values({
      iq_tenant_id: DEV_TENANT_ID,
      user_id: platformUserId,
      role_id: roleId,
    })
    .onConflictDoNothing({
      target: [user_roles.iq_tenant_id, user_roles.user_id, user_roles.role_id],
    });

  const { capabilityCount } = await syncSuperAdminCapabilitySnapshots(db, {
    tenantId: DEV_TENANT_ID,
    userId: platformUserId,
    roleId,
  });

  if (capabilityCount === 0) {
    throw new Error("No active capabilities for super-admin after catalog sync");
  }

  if (input.auth) {
    // The dev-seed CLI scripts under `tools/` run via tsx (TS-extension imports, deps resolved from
    // the repo root) and are intentionally outside this module's NodeNext type-checking surface.
    // Load them through `string`-typed paths so tsc treats them as runtime-only dynamic imports.
    // The explicit `: string` is load-bearing (it stops tsc resolving the literal path); the
    // inferrable-types rule would have us delete it, which would re-break the typecheck gate.
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types -- required for runtime-only dynamic import
    const createDevAuthToolPath: string =
      "../../../../tools/seed-user-management-dev/create-dev-auth.js";
    const { createDevSeedAuth, repairJwksForDevSeed } = (await import(
      createDevAuthToolPath
    )) as {
      createDevSeedAuth: (...args: unknown[]) => unknown;
      repairJwksForDevSeed: (...args: unknown[]) => Promise<unknown>;
    };
    const { DrizzleUserRepository } = await import("../data-access/user-repository.js");
    const { DrizzlePrincipalRoleProjectionRepository } = await import(
      "../data-access/drizzle-principal-role-projection-repository.js"
    );

    await repairJwksForDevSeed(db, input.auth.secret);
    const auth = createDevSeedAuth(db, input.auth, {
      userRepository: new DrizzleUserRepository(db),
      principalRoleProjectionRepository: new DrizzlePrincipalRoleProjectionRepository(db),
    }) as unknown as BetterAuthSignUpApi;

    const authUserId = await ensureSuperAdminAuthUser(db, auth, platformUserId);
    await db
      .update(users)
      .set({ auth_user_id: authUserId, updated_at: new Date() })
      .where(and(eq(users.iq_tenant_id, DEV_TENANT_ID), eq(users.id, platformUserId)));

    // eslint-disable-next-line @typescript-eslint/no-inferrable-types -- required for runtime-only dynamic import (see above)
    const seedDevelopmentUsersToolPath: string =
      "../../../../tools/seed-user-management-dev/seed-development-users.js";
    const { seedDevelopmentUser } = (await import(seedDevelopmentUsersToolPath)) as {
      seedDevelopmentUser: (...args: unknown[]) => Promise<unknown>;
    };
    const capabilityRows = await db
      .select({ id: capabilities.id, capability_key: capabilities.capability_key })
      .from(capabilities)
      .where(eq(capabilities.is_active, true));

    for (const seedUser of DEVELOPMENT_SEED_USERS) {
      if (seedUser.persona === "platformOperator") {
        continue;
      }
      await seedDevelopmentUser(db, auth, seedUser, capabilityRows);
    }
  }

  return {
    catalog_modules: catalog.moduleIdsBySlug.size,
    tenant_modules: cfg.tenant_modules,
    capabilities_synced: sync.inserted + sync.updated,
    super_admin_capabilities: capabilityCount,
  };
}
