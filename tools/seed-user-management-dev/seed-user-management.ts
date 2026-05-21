import { eq } from "drizzle-orm";
import { capabilities } from "../../modules/user-management/src/schema/tables.ts";
import { createDb, type DbInstance } from "../../packages/ts-sdk-db/src/index.ts";
import { DEVELOPMENT_SEED_USERS } from "../../packages/dev-bootstrap/src/index.ts";
import { DrizzleUserRepository } from "../../modules/user-management/src/data-access/user-repository.ts";
import { DrizzlePrincipalAuthorizationRepository } from "../../modules/user-management/src/data-access/principal-authorization-repository.ts";
import { DrizzlePrincipalRoleProjectionRepository } from "../../modules/user-management/src/data-access/drizzle-principal-role-projection-repository.ts";
import { createDefaultPrincipalService } from "../../modules/user-management/src/services/default-principal-service.ts";
import { remapLegacyCapabilityGrants } from "../../modules/user-management/src/dev/remap-legacy-capability-grants.ts";
import { syncCapabilitiesFromMasterDataCatalog } from "../../modules/user-management/src/dev/sync-capabilities-from-master-data-catalog.ts";
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

async function ensureCapabilities(
  db: DbInstance,
  masterDataDatabaseUrl: string,
): Promise<Array<{ id: string; capability_key: string }>> {
  const sync = await syncCapabilitiesFromMasterDataCatalog(db, masterDataDatabaseUrl);
  seedLog("user-management", "synced capabilities from Master Data module_permissions", sync);

  const remap = await remapLegacyCapabilityGrants(db);
  if (remap.remappedUserGrants > 0 || remap.remappedRoleGrants > 0) {
    seedLog("user-management", "remapped legacy capability grants to catalog slug keys", remap);
  }

  if (sync.inserted + sync.updated === 0) {
    throw new Error(
      "No capabilities synced from Master Data — run master-data migrations (make db-migrate) first.",
    );
  }

  const rows = await db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(eq(capabilities.is_active, true));

  return rows;
}

export async function seedUserManagement(
  databaseUrl: string,
  masterDataDatabaseUrl: string,
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

  const capabilityRows = await ensureCapabilities(db, masterDataDatabaseUrl);

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
