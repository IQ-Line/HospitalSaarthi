import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import {
  DEVELOPMENT_BOOTSTRAP_CREDENTIALS,
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_ROLE_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_BOOTSTRAP_USER_ID,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_BOOTSTRAP_USER_NAME,
  DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
  DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
  shouldRunPlatformDevelopmentBootstrap,
} from "@hims/dev-bootstrap";
import { inArray } from "drizzle-orm";
import { getCerbosClient } from "@hims/ts-sdk-authz";
import {
  buildCerbosUserMgmtResourceAttr,
  capabilities,
  role_capabilities,
  roles,
  user_capabilities,
  user_roles,
  UM_CAPABILITY_READ,
  UM_ROLE_ASSIGN,
  UM_ROLE_CREATE,
  UM_ROLE_READ,
  UM_ROLE_UPDATE,
  UM_USER_CREATE,
  UM_USER_DELETE,
  UM_USER_READ,
  UM_USER_UPDATE,
  users,
  assertValidModuleSlug,
  syncSuperAdminCapabilitySnapshots,
} from "@hims/user-management";
import { authUser } from "../auth/auth-schema.js";
import type { HimsBetterAuthInstance } from "../auth/create-hims-better-auth.js";

type FoundationCapabilitySeed = {
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description: string;
};

type BootstrapPrincipalService = {
  getPrincipal(context: {
    requestUser?: unknown;
    tenantId: string;
    userId: string;
  }): Promise<{
    attributes: {
      capabilities: string[];
      department: string | null;
      iq_tenant_id: string;
      org_id: string | null;
      delegated_capabilities: string[];
      clearances: Record<string, string>;
      um_clearance_effective_tier: number;
    };
    id: string;
    roles: string[];
  }>;
};

type BootstrapDeps = {
  auth: HimsBetterAuthInstance;
  cerbosUrl: string;
  db: DbInstance;
  principalService: BootstrapPrincipalService;
};

export type DevelopmentBootstrapResult = {
  credentials: {
    email: string;
    password: string;
  };
  roleCode: string;
  tenantId: string;
  userId: string;
  verifiedActions: string[];
};

export {
  DEVELOPMENT_BOOTSTRAP_CREDENTIALS,
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
} from "@hims/dev-bootstrap";

const FOUNDATIONAL_CAPABILITIES: readonly FoundationCapabilitySeed[] = [
  {
    capability_key: UM_USER_CREATE,
    module: "users",
    feature: "users",
    action: "create",
    display_name: "Create users",
    description: "Create tenant-scoped platform users.",
  },
  {
    capability_key: UM_USER_READ,
    module: "users",
    feature: "users",
    action: "read",
    display_name: "Read users",
    description: "Read tenant-scoped platform users.",
  },
  {
    capability_key: UM_USER_UPDATE,
    module: "users",
    feature: "users",
    action: "update",
    display_name: "Update users",
    description: "Update tenant-scoped platform users.",
  },
  {
    capability_key: UM_USER_DELETE,
    module: "users",
    feature: "users",
    action: "delete",
    display_name: "Delete user",
    description: "Deactivate tenant-scoped platform users.",
  },
  {
    capability_key: UM_ROLE_CREATE,
    module: "user-roles",
    feature: "user-roles",
    action: "create",
    display_name: "Create roles",
    description: "Create tenant-scoped roles.",
  },
  {
    capability_key: UM_ROLE_READ,
    module: "user-roles",
    feature: "user-roles",
    action: "read",
    display_name: "Read roles",
    description: "Read tenant-scoped roles and role composition.",
  },
  {
    capability_key: UM_ROLE_UPDATE,
    module: "user-roles",
    feature: "user-roles",
    action: "update",
    display_name: "Update roles",
    description: "Update tenant-scoped roles and role composition.",
  },
  {
    capability_key: UM_ROLE_ASSIGN,
    module: "user-roles",
    feature: "role",
    action: "assign",
    display_name: "Assign roles",
    description: "Assign tenant-scoped roles to platform users.",
  },
  {
    capability_key: UM_CAPABILITY_READ,
    module: "user-capabilities",
    feature: "user-capabilities",
    action: "read",
    display_name: "Read capabilities",
    description: "Read the canonical capability catalog.",
  },
] as const;

export const DEVELOPMENT_FOUNDATIONAL_CAPABILITIES = FOUNDATIONAL_CAPABILITIES;

export function shouldRunDevelopmentBootstrap(): boolean {
  return shouldRunPlatformDevelopmentBootstrap();
}

async function ensureFoundationalCapabilities(
  db: DbInstance,
): Promise<Array<{ id: string; capability_key: string }>> {
  for (const capability of FOUNDATIONAL_CAPABILITIES) {
    const moduleSlug = assertValidModuleSlug(capability.module, "bootstrap capability module");
    await db
      .insert(capabilities)
      .values({
        capability_key: capability.capability_key,
        module: moduleSlug,
        feature: capability.feature,
        action: capability.action,
        display_name: capability.display_name,
        description: capability.description,
        is_active: true,
      })
      .onConflictDoUpdate({
        target: [capabilities.capability_key],
        set: {
          module: moduleSlug,
          feature: capability.feature,
          action: capability.action,
          display_name: capability.display_name,
          description: capability.description,
          is_active: true,
          updated_at: new Date(),
        },
      });
  }

  const rows = await db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(inArray(capabilities.capability_key, FOUNDATIONAL_CAPABILITIES.map((item) => item.capability_key)));

  if (rows.length !== FOUNDATIONAL_CAPABILITIES.length) {
    throw new Error("Bootstrap capability seed incomplete.");
  }

  return rows.sort((a, b) => a.capability_key.localeCompare(b.capability_key));
}

async function ensureBootstrapRole(db: DbInstance): Promise<string> {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
        eq(roles.code, DEVELOPMENT_BOOTSTRAP_ROLE_CODE),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(roles)
      .set({
        role_type: DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
        display_name: "Super Admin",
        description: "Bootstrap super-admin role for development initialization.",
        is_system: true,
        status: "active",
        updated_at: new Date(),
      })
      .where(
        and(
          eq(roles.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
          eq(roles.id, existing.id),
        ),
      );
    return existing.id;
  }

  await db.insert(roles).values({
    iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    id: DEVELOPMENT_BOOTSTRAP_ROLE_ID,
    code: DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
    role_type: DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
    display_name: "Super Admin",
    description: "Bootstrap super-admin role for development initialization.",
    is_system: true,
    status: "active",
  });

  return DEVELOPMENT_BOOTSTRAP_ROLE_ID;
}

async function readAuthUserByEmail(db: DbInstance) {
  const [row] = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      iq_tenant_id: authUser.iq_tenant_id,
    })
    .from(authUser)
    .where(eq(authUser.email, DEVELOPMENT_BOOTSTRAP_USER_EMAIL))
    .limit(1);
  return row ?? null;
}

async function readPlatformUserByEmail(db: DbInstance) {
  const [row] = await db
    .select({
      id: users.id,
      auth_user_id: users.auth_user_id,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        eq(users.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
        eq(users.email, DEVELOPMENT_BOOTSTRAP_USER_EMAIL),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function ensureBootstrapPlatformUser(
  db: DbInstance,
  preferredUserId: string,
): Promise<string> {
  const existing = await readPlatformUserByEmail(db);
  if (existing) {
    await db
      .update(users)
      .set({
        full_name: DEVELOPMENT_BOOTSTRAP_USER_NAME,
        email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
        username: DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
        org_id: DEVELOPMENT_BOOTSTRAP_ORG_ID,
        status: "active",
        updated_at: new Date(),
      })
      .where(
        and(
          eq(users.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
          eq(users.id, existing.id),
        ),
      );
    return existing.id;
  }

  await db.insert(users).values({
    iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    id: preferredUserId,
    full_name: DEVELOPMENT_BOOTSTRAP_USER_NAME,
    email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
    username: DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
    org_id: DEVELOPMENT_BOOTSTRAP_ORG_ID,
    status: "active",
  });
  return preferredUserId;
}

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

async function ensureBootstrapAuthUser(
  db: DbInstance,
  auth: HimsBetterAuthInstance,
  platformUserId: string,
): Promise<string> {
  const existing = await readAuthUserByEmail(db);
  if (existing) {
    if (existing.id !== platformUserId) {
      throw new Error(
        `Bootstrap auth user id ${existing.id} does not match platform user id ${platformUserId}.`,
      );
    }
    if (existing.iq_tenant_id !== DEVELOPMENT_BOOTSTRAP_TENANT_ID) {
      throw new Error("Bootstrap auth user tenant does not match the bootstrap tenant.");
    }
    return existing.id;
  }

  const serverApi = auth as unknown as BetterAuthServerApi;
  await serverApi.api.signUpEmail({
    body: {
      name: DEVELOPMENT_BOOTSTRAP_USER_NAME,
      email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
      password: DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
      iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
      platform_user_id: platformUserId,
    },
  });

  const created = await readAuthUserByEmail(db);
  if (!created) {
    throw new Error("Bootstrap better-auth user was not created.");
  }
  if (created.id !== platformUserId) {
    throw new Error("Bootstrap better-auth user id does not match the platform user id.");
  }
  return created.id;
}

async function ensurePlatformUserAuthLink(
  db: DbInstance,
  platformUserId: string,
  authUserId: string,
): Promise<void> {
  await db
    .update(users)
    .set({
      auth_user_id: authUserId,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(users.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
        eq(users.id, platformUserId),
      ),
    );
}

async function ensureBootstrapRoleCapabilities(
  db: DbInstance,
  roleId: string,
  capabilityIds: readonly string[],
): Promise<void> {
  if (capabilityIds.length === 0) return;
  await db
    .insert(role_capabilities)
    .values(
      capabilityIds.map((capabilityId) => ({
        iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
        role_id: roleId,
        capability_id: capabilityId,
      })),
    )
    .onConflictDoNothing({
      target: [
        role_capabilities.iq_tenant_id,
        role_capabilities.role_id,
        role_capabilities.capability_id,
      ],
    });
}

async function ensureBootstrapUserRoleTemplate(
  db: DbInstance,
  userId: string,
  roleId: string,
): Promise<void> {
  await db
    .insert(user_roles)
    .values({
      iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
      user_id: userId,
      role_id: roleId,
    })
    .onConflictDoNothing({
      target: [
        user_roles.iq_tenant_id,
        user_roles.user_id,
        user_roles.role_id,
      ],
    });
}

async function ensureBootstrapUserCapabilities(
  db: DbInstance,
  userId: string,
  roleId: string,
  capabilityIds: readonly string[],
): Promise<void> {
  if (capabilityIds.length === 0) return;
  const grantedAt = new Date();
  await db
    .insert(user_capabilities)
    .values(
      capabilityIds.map((capabilityId) => ({
        iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
        user_id: userId,
        capability_id: capabilityId,
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
        granted_by_user_id: null,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      },
    });
}

function assertBootstrapIdentityConsistency(
  authRow: Awaited<ReturnType<typeof readAuthUserByEmail>>,
  platformRow: Awaited<ReturnType<typeof readPlatformUserByEmail>>,
): void {
  if (authRow && platformRow && authRow.id !== platformRow.id) {
    throw new Error(
      `Bootstrap auth/platform user mismatch: auth user id ${authRow.id}, platform user id ${platformRow.id}.`,
    );
  }
}

async function verifyBootstrapPrincipal(
  principalService: BootstrapPrincipalService,
  userId: string,
): Promise<Awaited<ReturnType<BootstrapPrincipalService["getPrincipal"]>>> {
  const principal = await principalService.getPrincipal({
    tenantId: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    userId,
  });

  const requiredKeys = [
    UM_USER_CREATE,
    UM_USER_READ,
    UM_ROLE_CREATE,
    UM_ROLE_ASSIGN,
    UM_CAPABILITY_READ,
  ] as const;
  for (const capability of requiredKeys) {
    if (!principal.attributes.capabilities.includes(capability)) {
      throw new Error(`Bootstrap principal missing capability ${capability}.`);
    }
  }

  if (!principal.roles.includes(DEVELOPMENT_BOOTSTRAP_ROLE_CODE)) {
    throw new Error("Bootstrap principal missing the super-admin role code.");
  }

  return principal;
}

async function verifyBootstrapCerbos(
  cerbosUrl: string,
  principal: Awaited<ReturnType<BootstrapPrincipalService["getPrincipal"]>>,
  userId: string,
): Promise<string[]> {
  const cerbos = getCerbosClient({ cerbosUrl });
  const tenantOnlyAttr = buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    department: null,
    required_clearance: 0,
  });
  const selfAttr = buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    department: null,
    required_clearance: 0,
    org_id: DEVELOPMENT_BOOTSTRAP_ORG_ID,
  });

  const crossTenantAttr = buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: "00000000-0000-4000-8000-000000000001",
    department: null,
    required_clearance: 0,
  });

  const checks = [
    { kind: "user", id: "new", action: "user.create", attr: tenantOnlyAttr },
    { kind: "user", id: "new", action: "user.create", attr: crossTenantAttr },
    { kind: "user", id: userId, action: "user.read", attr: selfAttr },
    { kind: "user", id: userId, action: "user.update", attr: selfAttr },
    { kind: "user", id: userId, action: "user.deactivate", attr: selfAttr },
    { kind: "role", id: "new", action: "role.create", attr: tenantOnlyAttr },
    { kind: "role", id: "new", action: "role.create", attr: crossTenantAttr },
    { kind: "role", id: DEVELOPMENT_BOOTSTRAP_ROLE_CODE, action: "role.read", attr: tenantOnlyAttr },
    { kind: "role", id: DEVELOPMENT_BOOTSTRAP_ROLE_CODE, action: "role.update", attr: tenantOnlyAttr },
    { kind: "user_role_template", id: "new", action: "role.assign", attr: tenantOnlyAttr },
    { kind: "user_role_template", id: "new", action: "role.assign", attr: crossTenantAttr },
    { kind: "capability", id: "list", action: "capability.read", attr: tenantOnlyAttr },
  ] as const;

  const allowed: string[] = [];
  for (const check of checks) {
    const result = await cerbos.checkResource({
      principal: {
        id: principal.id,
        roles: principal.roles,
        attr: principal.attributes,
      },
      resource: {
        kind: check.kind,
        id: check.id,
        attr: check.attr,
      },
      actions: [check.action],
    });

    if (!result.isAllowed(check.action)) {
      throw new Error(`Bootstrap Cerbos verification failed for ${check.action}.`);
    }
    allowed.push(check.action);
  }

  return allowed;
}

export async function runDevelopmentBootstrap(
  deps: BootstrapDeps,
): Promise<DevelopmentBootstrapResult> {
  await ensureFoundationalCapabilities(deps.db);
  const roleId = await ensureBootstrapRole(deps.db);

  const existingAuthUser = await readAuthUserByEmail(deps.db);
  const existingPlatformUser = await readPlatformUserByEmail(deps.db);
  assertBootstrapIdentityConsistency(existingAuthUser, existingPlatformUser);

  const preferredUserId =
    existingAuthUser?.id ?? existingPlatformUser?.id ?? DEVELOPMENT_BOOTSTRAP_USER_ID;
  const platformUserId = await ensureBootstrapPlatformUser(deps.db, preferredUserId);
  const authUserId = await ensureBootstrapAuthUser(deps.db, deps.auth, platformUserId);
  await ensurePlatformUserAuthLink(deps.db, platformUserId, authUserId);
  await ensureBootstrapUserRoleTemplate(deps.db, platformUserId, roleId);
  const synced = await syncSuperAdminCapabilitySnapshots(deps.db, {
    tenantId: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    userId: platformUserId,
    roleId,
  });
  if (synced.capabilityCount === 0) {
    throw new Error("Bootstrap super-admin sync found no active capabilities in catalog.");
  }

  const principal = await verifyBootstrapPrincipal(deps.principalService, platformUserId);
  const verifiedActions = await verifyBootstrapCerbos(deps.cerbosUrl, principal, platformUserId);

  return {
    tenantId: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    userId: platformUserId,
    roleCode: DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
    credentials: {
      email: DEVELOPMENT_BOOTSTRAP_CREDENTIALS.email,
      password: DEVELOPMENT_BOOTSTRAP_CREDENTIALS.password,
    },
    verifiedActions,
  };
}
