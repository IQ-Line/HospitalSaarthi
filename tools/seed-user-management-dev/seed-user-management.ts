import { and, eq, inArray } from "drizzle-orm";
import {
  capabilities,
  role_capabilities,
  roles,
  user_capabilities,
  user_roles,
  users,
} from "../../modules/user-management/src/schema/tables.ts";
import { createDb, type DbInstance } from "../../packages/ts-sdk-db/src/index.ts";
import { authUser } from "../../services/user-management-svc/src/auth/auth-schema.ts";
import { createDevSeedAuth, repairJwksForDevSeed } from "./create-dev-auth.ts";
import { DrizzleUserRepository } from "../../modules/user-management/src/data-access/user-repository.ts";
import { DrizzlePrincipalAuthorizationRepository } from "../../modules/user-management/src/data-access/principal-authorization-repository.ts";
import { DrizzlePrincipalRoleProjectionRepository } from "../../modules/user-management/src/data-access/drizzle-principal-role-projection-repository.ts";
import { createDefaultPrincipalService } from "../../modules/user-management/src/services/default-principal-service.ts";
import {
  DEV_ORG_ID,
  DEV_TENANT_ID,
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_ROLE_ID,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_BOOTSTRAP_USER_ID,
  DEVELOPMENT_BOOTSTRAP_USER_NAME,
  DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
  DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
  SEED_CAPABILITIES,
} from "./constants.ts";
import { seedLog } from "./log.ts";
import { normalizePostgresUrl } from "./load-env.ts";

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
  const rows = await db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(inArray(capabilities.capability_key, keys));

  if (rows.length !== SEED_CAPABILITIES.length) {
    throw new Error("Capability seed incomplete.");
  }
  return rows;
}

async function ensureSuperAdminRole(db: DbInstance): Promise<string> {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.iq_tenant_id, DEV_TENANT_ID),
        eq(roles.code, DEVELOPMENT_BOOTSTRAP_ROLE_CODE),
      ),
    )
    .limit(1);

  if (existing) {
    return existing.id;
  }

  await db.insert(roles).values({
    iq_tenant_id: DEV_TENANT_ID,
    id: DEVELOPMENT_BOOTSTRAP_ROLE_ID,
    code: DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
    display_name: "Super Admin",
    description: "Dev seed super-admin role.",
    is_system: true,
    status: "active",
  });

  return DEVELOPMENT_BOOTSTRAP_ROLE_ID;
}

async function ensurePlatformUser(db: DbInstance): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.iq_tenant_id, DEV_TENANT_ID),
        eq(users.email, DEVELOPMENT_BOOTSTRAP_USER_EMAIL),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        full_name: DEVELOPMENT_BOOTSTRAP_USER_NAME,
        username: DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
        org_id: DEV_ORG_ID,
        status: "active",
        updated_at: new Date(),
      })
      .where(and(eq(users.iq_tenant_id, DEV_TENANT_ID), eq(users.id, existing.id)));
    return existing.id;
  }

  await db.insert(users).values({
    iq_tenant_id: DEV_TENANT_ID,
    id: DEVELOPMENT_BOOTSTRAP_USER_ID,
    full_name: DEVELOPMENT_BOOTSTRAP_USER_NAME,
    email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
    username: DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
    org_id: DEV_ORG_ID,
    status: "active",
  });

  return DEVELOPMENT_BOOTSTRAP_USER_ID;
}

async function ensureAuthUser(
  db: DbInstance,
  auth: BetterAuthServerApi,
  platformUserId: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, DEVELOPMENT_BOOTSTRAP_USER_EMAIL))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  await auth.api.signUpEmail({
    body: {
      name: DEVELOPMENT_BOOTSTRAP_USER_NAME,
      email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
      password: DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
      iq_tenant_id: DEV_TENANT_ID,
      platform_user_id: platformUserId,
    },
  });

  const [created] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, DEVELOPMENT_BOOTSTRAP_USER_EMAIL))
    .limit(1);

  if (!created) {
    throw new Error("better-auth user was not created.");
  }
  return created.id;
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
  let capabilityCount = 0;
  let roleCount = 0;
  let userCount = 0;

  await repairJwksForDevSeed(db, authEnv.secret);

  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);

  const auth = createDevSeedAuth(db, authEnv, {
    userRepository,
    principalRoleProjectionRepository,
  }) as unknown as BetterAuthServerApi;

  let platformUserId = DEVELOPMENT_BOOTSTRAP_USER_ID;
  let roleId = DEVELOPMENT_BOOTSTRAP_ROLE_ID;

  await db.transaction(async (tx) => {
    const capabilityRows = await ensureCapabilities(tx as DbInstance);
    capabilityCount = capabilityRows.length;

    roleId = await ensureSuperAdminRole(tx as DbInstance);
    roleCount = 1;

    await tx
      .insert(role_capabilities)
      .values(
        capabilityRows.map((row) => ({
          iq_tenant_id: DEV_TENANT_ID,
          role_id: roleId,
          capability_id: row.id,
        })),
      )
      .onConflictDoNothing({
        target: [
          role_capabilities.iq_tenant_id,
          role_capabilities.role_id,
          role_capabilities.capability_id,
        ],
      });

    platformUserId = await ensurePlatformUser(tx as DbInstance);
    userCount = 1;

    await tx
      .insert(user_roles)
      .values({
        iq_tenant_id: DEV_TENANT_ID,
        user_id: platformUserId,
        role_id: roleId,
      })
      .onConflictDoNothing({
        target: [user_roles.iq_tenant_id, user_roles.user_id, user_roles.role_id],
      });

    const grantedAt = new Date();
    await tx
      .insert(user_capabilities)
      .values(
        capabilityRows.map((row) => ({
          iq_tenant_id: DEV_TENANT_ID,
          user_id: platformUserId,
          capability_id: row.id,
          grant_source: "role_template" as const,
          source_role_id: roleId,
          granted_by_user_id: null,
          granted_at: grantedAt,
          revoked_at: null,
          revoked_by_user_id: null,
        })),
      )
      .onConflictDoUpdate({
        target: [
          user_capabilities.iq_tenant_id,
          user_capabilities.user_id,
          user_capabilities.capability_id,
        ],
        set: {
          grant_source: "role_template",
          source_role_id: roleId,
          granted_at: grantedAt,
          revoked_at: null,
          revoked_by_user_id: null,
        },
      });

    seedLog("user-management", "runtime grants committed", {
      capabilities: capabilityCount,
      roles: roleCount,
      users: userCount,
      email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
    });
  });

  const authUserId = await ensureAuthUser(db, auth, platformUserId);
  await db
    .update(users)
    .set({ auth_user_id: authUserId, updated_at: new Date() })
    .where(and(eq(users.iq_tenant_id, DEV_TENANT_ID), eq(users.id, platformUserId)));

  return { capabilities: capabilityCount, roles: roleCount, users: userCount };
}

export function buildPrincipalService(db: DbInstance) {
  return createDefaultPrincipalService({
    userRepository: new DrizzleUserRepository(db),
    principalRoleProjectionRepository: new DrizzlePrincipalRoleProjectionRepository(db),
    principalAuthorizationRepository: new DrizzlePrincipalAuthorizationRepository(db),
  });
}
