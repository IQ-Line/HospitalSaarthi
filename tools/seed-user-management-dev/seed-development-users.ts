import { and, eq, inArray } from "drizzle-orm";
import type { DevelopmentSeedUser } from "../../packages/dev-bootstrap/src/development-seed-users.ts";
import {
  capabilities,
  role_capabilities,
  roles,
  user_capabilities,
  user_roles,
  users,
} from "../../modules/user-management/src/schema/tables.ts";
import type { DbInstance } from "../../packages/ts-sdk-db/src/index.ts";
import { authUser } from "../../services/user-management-svc/src/auth/auth-schema.ts";
import {
  CLINICAL_CAPABILITY_KEYS,
  DEV_ORG_ID,
  DEV_TENANT_ID,
  PLATFORM_OPERATOR_CAPABILITY_KEYS,
  READONLY_CAPABILITY_KEYS,
  TENANT_ADMIN_CAPABILITY_KEYS,
} from "./constants.ts";
import { seedLog } from "./log.ts";

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

function capabilityKeysForPersona(persona: DevelopmentSeedUser["persona"]): readonly string[] {
  switch (persona) {
    case "platformOperator":
      return PLATFORM_OPERATOR_CAPABILITY_KEYS;
    case "tenantAdmin":
      return TENANT_ADMIN_CAPABILITY_KEYS;
    case "readonlyUser":
      return READONLY_CAPABILITY_KEYS;
    case "clinicalUser":
      return CLINICAL_CAPABILITY_KEYS;
    default:
      return PLATFORM_OPERATOR_CAPABILITY_KEYS;
  }
}

async function ensureRole(
  db: DbInstance,
  seedUser: DevelopmentSeedUser,
): Promise<string> {
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
    display_name: seedUser.name,
    description: `Dev seed role (${seedUser.roleCode}).`,
    is_system: seedUser.persona === "platformOperator",
    status: "active",
  });

  return seedUser.roleId;
}

async function ensurePlatformUser(db: DbInstance, seedUser: DevelopmentSeedUser): Promise<string> {
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

async function ensureAuthUser(
  db: DbInstance,
  auth: BetterAuthServerApi,
  seedUser: DevelopmentSeedUser,
  platformUserId: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, seedUser.email))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  await auth.api.signUpEmail({
    body: {
      name: seedUser.name,
      email: seedUser.email,
      password: seedUser.password,
      iq_tenant_id: DEV_TENANT_ID,
      platform_user_id: platformUserId,
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

export async function seedDevelopmentUser(
  db: DbInstance,
  auth: BetterAuthServerApi,
  seedUser: DevelopmentSeedUser,
  capabilityRows: Array<{ id: string; capability_key: string }>,
): Promise<void> {
  const keys = capabilityKeysForPersona(seedUser.persona);
  const granted = capabilityRows.filter((row) => keys.includes(row.capability_key));
  if (granted.length === 0) {
    throw new Error(`No capabilities resolved for persona ${seedUser.persona}`);
  }

  const roleId = await ensureRole(db, seedUser);
  const platformUserId = await ensurePlatformUser(db, seedUser);

  await db
    .insert(role_capabilities)
    .values(
      granted.map((row) => ({
        iq_tenant_id: DEV_TENANT_ID,
        role_id: roleId,
        capability_id: row.id,
      })),
    )
    .onConflictDoNothing({
      target: [role_capabilities.iq_tenant_id, role_capabilities.role_id, role_capabilities.capability_id],
    });

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

  const grantedAt = new Date();
  await db
    .insert(user_capabilities)
    .values(
      granted.map((row) => ({
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
      target: [user_capabilities.iq_tenant_id, user_capabilities.user_id, user_capabilities.capability_id],
      set: {
        grant_source: "role_template",
        source_role_id: roleId,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      },
    });

  const authUserId = await ensureAuthUser(db, auth, seedUser, platformUserId);
  await db
    .update(users)
    .set({ auth_user_id: authUserId, updated_at: new Date() })
    .where(and(eq(users.iq_tenant_id, DEV_TENANT_ID), eq(users.id, platformUserId)));

  seedLog("user-management", `seeded dev user ${seedUser.persona}`, {
    email: seedUser.email,
    capabilities: granted.length,
    role: seedUser.roleCode,
  });
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
