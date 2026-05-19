import { GRPC } from "@cerbos/grpc";
import { buildCerbosUserMgmtResourceAttr } from "../../modules/user-management/src/authz/cerbos-resource-attr.ts";
import { DEV_TENANT_ID } from "./constants.ts";
import { DEVELOPMENT_PLATFORM_OPERATOR } from "../../packages/dev-bootstrap/src/index.ts";
import { seedLog } from "./log.ts";
import type { createDefaultPrincipalService } from "../../modules/user-management/src/services/default-principal-service.ts";

export type CerbosValidationResult = {
  ok: boolean;
  checks: Array<{ action: string; allowed: boolean }>;
};

export async function validateCerbosForBootstrapUser(
  cerbosUrl: string,
  principalService: ReturnType<typeof createDefaultPrincipalService>,
): Promise<CerbosValidationResult> {
  const cerbos = new GRPC(cerbosUrl, { tls: false });
  const principal = await principalService.getPrincipal({
    tenantId: DEV_TENANT_ID,
    userId: DEVELOPMENT_PLATFORM_OPERATOR.userId,
  });

  const tenantOnlyAttr = buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: DEV_TENANT_ID,
    department: null,
    required_clearance: 0,
  });

  const checks = [
    { kind: "user", id: "new", action: "user.create" },
    { kind: "role", id: "new", action: "role.create" },
    { kind: "user_role_template", id: "new", action: "role.assign" },
  ] as const;

  const results: Array<{ action: string; allowed: boolean }> = [];

  for (const check of checks) {
    const response = await cerbos.checkResource({
      principal: {
        id: principal.id,
        roles: principal.roles,
        attr: principal.attributes,
      },
      resource: {
        kind: check.kind,
        id: check.id,
        attr: tenantOnlyAttr,
      },
      actions: [check.action],
    });
    const allowed = response.isAllowed(check.action);
    results.push({ action: check.action, allowed });
    seedLog("cerbos", allowed ? "allowed" : "denied", {
      action: check.action,
      capabilityCount: principal.attributes.capabilities.length,
    });
  }

  cerbos.close();
  const ok = results.every((r) => r.allowed);
  return { ok, checks: results };
}
