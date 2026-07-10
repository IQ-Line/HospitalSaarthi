import { getCerbosClient } from "@hims/ts-sdk-authz";
import {
  buildCerbosUserMgmtResourceAttr,
  UM_CAPABILITY_READ,
  UM_ROLE_ASSIGN,
  UM_ROLE_CREATE,
  UM_USER_CREATE,
  UM_USER_READ,
} from "@hims/user-management";
import {
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
} from "@hims/dev-bootstrap";

export type BootstrapPrincipalService = {
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

export async function verifyBootstrapPrincipal(
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

export async function verifyBootstrapCerbos(
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
