import { and, eq, inArray } from "drizzle-orm";
import type { DevelopmentSeedUser } from "../../packages/dev-bootstrap/src/development-seed-users.ts";
import {
  capabilities,
  platform_admins,
  role_capabilities,
  roles,
  user_roles,
  users,
} from "../../modules/user-management/src/schema/tables.ts";
import type { DbInstance } from "../../packages/ts-sdk-db/src/index.ts";
import { authUser } from "../../services/user-management-svc/src/auth/auth-schema.ts";
import { toSyntheticAuthEmail } from "../../services/user-management-svc/src/auth/synthetic-email.ts";
import { DEV_ORG_ID, DEV_TENANT_ID, filterCapabilityKeysForPersona } from "./constants.ts";
import { seedLog } from "./log.ts";

export type TenantSeedContext = {
  tenantId: string;
  orgId: string;
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

async function ensureRole(
  db: DbInstance,
  context: TenantSeedContext,
  seedUser: DevelopmentSeedUser,
): Promise<string> {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.iq_tenant_id, context.tenantId), eq(roles.code, seedUser.roleCode)))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  await db.insert(roles).values({
    iq_tenant_id: context.tenantId,
    id: seedUser.roleId,
    code: seedUser.roleCode,
    role_type: seedUser.roleCode,
    display_name: seedUser.name,
    description: `Dev seed role (${seedUser.roleCode}).`,
    is_system: seedUser.persona === "platformOperator",
    status: "active",
  });

  return seedUser.roleId;
}

async function ensurePlatformUser(
  db: DbInstance,
  context: TenantSeedContext,
  seedUser: DevelopmentSeedUser,
): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.iq_tenant_id, context.tenantId), eq(users.email, seedUser.email)))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        full_name: seedUser.name,
        username: seedUser.username,
        org_id: context.orgId,
        status: "active",
        updated_at: new Date(),
      })
      .where(and(eq(users.iq_tenant_id, context.tenantId), eq(users.id, existing.id)));
    return existing.id;
  }

  await db.insert(users).values({
    iq_tenant_id: context.tenantId,
    id: seedUser.userId,
    full_name: seedUser.name,
    email: seedUser.email,
    username: seedUser.username,
    org_id: context.orgId,
    status: "active",
  });

  return seedUser.userId;
}

async function ensureAuthUser(
  db: DbInstance,
  auth: BetterAuthServerApi,
  context: TenantSeedContext,
  seedUser: DevelopmentSeedUser,
  platformUserId: string,
): Promise<string> {
  // Identity anchor is the synthetic {username}@auth.internal (authn spec §15.1); the seed user's
  // real email lives only on the platform `users` row. Login is by username.
  const syntheticEmail = toSyntheticAuthEmail(seedUser.username);
  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, syntheticEmail))
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
      email: syntheticEmail,
      password: seedUser.password,
      iq_tenant_id: context.tenantId,
      platform_user_id: platformUserId,
      username: seedUser.username,
    },
  });

  const [created] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, syntheticEmail))
    .limit(1);

  if (!created) {
    throw new Error(`better-auth user was not created for ${seedUser.username}`);
  }
  return created.id;
}

export async function seedTenantUser(
  db: DbInstance,
  auth: BetterAuthServerApi,
  context: TenantSeedContext,
  seedUser: DevelopmentSeedUser,
  capabilityRows: Array<{ id: string; capability_key: string }>,
): Promise<void> {
  const roleId = await ensureRole(db, context, seedUser);
  const platformUserId = await ensurePlatformUser(db, context, seedUser);

  await db
    .insert(user_roles)
    .values({
      iq_tenant_id: context.tenantId,
      user_id: platformUserId,
      role_id: roleId,
    })
    .onConflictDoNothing({
      target: [user_roles.iq_tenant_id, user_roles.user_id, user_roles.role_id],
    });

  let grantedCount: number;
  if (seedUser.persona === "platformOperator") {
    // Bounded operator: enroll in platform_admins (scope:platform) — NO capability grants.
    await db
      .insert(platform_admins)
      .values({ user_id: platformUserId, note: "dev seed — bounded platform operator" })
      .onConflictDoNothing({ target: [platform_admins.user_id] });
    grantedCount = 0;
  } else {
    const keys = filterCapabilityKeysForPersona(
      seedUser.persona,
      capabilityRows.map((row) => row.capability_key),
    );
    const granted = capabilityRows.filter((row) => keys.includes(row.capability_key));
    if (granted.length === 0) {
      throw new Error(`No capabilities resolved for persona ${seedUser.persona}`);
    }

    // ADR-0037: role capabilities are read live from `role_capabilities` at principal hydration.
    // The dev seed writes the role composition + the user's membership only — no per-user
    // capability rows. `user_capabilities` is now exclusively grant/deny overrides, which a dev
    // persona does not need. A persona's effective access flows through its role membership.
    await db
      .insert(role_capabilities)
      .values(
        granted.map((row) => ({
          iq_tenant_id: context.tenantId,
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

    grantedCount = granted.length;
  }

  const authUserId = await ensureAuthUser(db, auth, context, seedUser, platformUserId);
  await db
    .update(users)
    .set({ auth_user_id: authUserId, updated_at: new Date() })
    .where(and(eq(users.iq_tenant_id, context.tenantId), eq(users.id, platformUserId)));

  seedLog("user-management", `seeded tenant user ${seedUser.persona}`, {
    tenantId: context.tenantId,
    email: seedUser.email,
    capabilities: grantedCount,
    role: seedUser.roleCode,
  });
}

export async function seedDevelopmentUser(
  db: DbInstance,
  auth: BetterAuthServerApi,
  seedUser: DevelopmentSeedUser,
  capabilityRows: Array<{ id: string; capability_key: string }>,
): Promise<void> {
  return seedTenantUser(
    db,
    auth,
    { tenantId: DEV_TENANT_ID, orgId: DEV_ORG_ID },
    seedUser,
    capabilityRows,
  );
}

export async function loadActiveCapabilityRows(
  db: DbInstance,
): Promise<Array<{ id: string; capability_key: string }>> {
  return db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(eq(capabilities.is_active, true));
}

export async function resolveCapabilityRows(
  db: DbInstance,
  keys: readonly string[],
): Promise<Array<{ id: string; capability_key: string }>> {
  const rows = await db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(inArray(capabilities.capability_key, [...keys]));

  if (rows.length !== keys.length) {
    const found = new Set(rows.map((r) => r.capability_key));
    const missing = keys.filter((k) => !found.has(k));
    throw new Error(`Missing capabilities in catalog: ${missing.join(", ")}`);
  }
  return rows;
}
