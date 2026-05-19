import { eq } from "drizzle-orm";
import { capabilities } from "../../modules/user-management/src/schema/tables.ts";
import { createDb, type DbInstance } from "../../packages/ts-sdk-db/src/index.ts";
import { DEVELOPMENT_SEED_USERS } from "../../packages/dev-bootstrap/src/index.ts";
import { DrizzleUserRepository } from "../../modules/user-management/src/data-access/user-repository.ts";
import { DrizzlePrincipalAuthorizationRepository } from "../../modules/user-management/src/data-access/principal-authorization-repository.ts";
import { DrizzlePrincipalRoleProjectionRepository } from "../../modules/user-management/src/data-access/drizzle-principal-role-projection-repository.ts";
import { createDefaultPrincipalService } from "../../modules/user-management/src/services/default-principal-service.ts";
import { SEED_CAPABILITIES } from "./constants.ts";
import { createDevSeedAuth, repairJwksForDevSeed } from "./create-dev-auth.ts";
import { normalizePostgresUrl } from "./load-env.ts";
import { seedLog } from "./log.ts";
import { resolveCapabilityRows, seedDevelopmentUser } from "./seed-development-users.ts";

export type UserManagementSeedResult = {
  capabilities: number;
  roles: number;
  users: number;
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
      };
    }): Promise<unknown>;
  };
};

async function ensureCapabilities(db: DbInstance): Promise<Array<{ id: string; capability_key: string }>> {
  await db
    .update(capabilities)
    .set({
      capability_key: "billing:payment:manage",
      module: "billing",
      feature: "payment",
      action: "manage",
      display_name: "Collect payment",
      description: "Dev seed capability (billing:payment:manage).",
      source_module_slug: "billing",
      source_permission_slug: "payment.collect",
      source_catalog: "master_data",
      is_active: true,
      updated_at: new Date(),
    })
    .where(eq(capabilities.capability_key, "billing:payment:collect"));

  for (const cap of SEED_CAPABILITIES) {
    await db
      .insert(capabilities)
      .values({
        capability_key: cap.capability_key,
        module: cap.module,
        feature: cap.feature,
        action: cap.action,
        display_name: cap.display_name,
        description: `Dev seed capability (${cap.capability_key}).`,
        is_active: true,
        source_module_slug: cap.module,
        source_permission_slug: cap.source_permission_slug,
        source_catalog: "master_data",
      })
      .onConflictDoUpdate({
        target: [capabilities.capability_key],
        set: {
          module: cap.module,
          feature: cap.feature,
          action: cap.action,
          display_name: cap.display_name,
          description: `Dev seed capability (${cap.capability_key}).`,
          is_active: true,
          source_module_slug: cap.module,
          source_permission_slug: cap.source_permission_slug,
          source_catalog: "master_data",
          updated_at: new Date(),
        },
      });
  }

  const keys = SEED_CAPABILITIES.map((c) => c.capability_key);
  return resolveCapabilityRows(db, keys);
}

export async function seedUserManagement(
  databaseUrl: string,
  authEnv: {
    authBaseUrl: string;
    secret: string;
    jwtIssuer: string;
    jwtAudience: string;
  },
): Promise<UserManagementSeedResult> {
  const db = createDb(normalizePostgresUrl(databaseUrl));

  await repairJwksForDevSeed(db, authEnv.secret);

  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);

  const auth = createDevSeedAuth(db, authEnv, {
    userRepository,
    principalRoleProjectionRepository,
  }) as unknown as BetterAuthServerApi;

  const capabilityRows = await ensureCapabilities(db);

  for (const seedUser of DEVELOPMENT_SEED_USERS) {
    await seedDevelopmentUser(db, auth, seedUser, capabilityRows);
  }

  seedLog("user-management", "development users seeded", {
    users: DEVELOPMENT_SEED_USERS.length,
    capabilities: capabilityRows.length,
  });

  return {
    capabilities: capabilityRows.length,
    roles: DEVELOPMENT_SEED_USERS.length,
    users: DEVELOPMENT_SEED_USERS.length,
  };
}

export function buildPrincipalService(db: DbInstance) {
  return createDefaultPrincipalService({
    userRepository: new DrizzleUserRepository(db),
    principalRoleProjectionRepository: new DrizzlePrincipalRoleProjectionRepository(db),
    principalAuthorizationRepository: new DrizzlePrincipalAuthorizationRepository(db),
  });
}
