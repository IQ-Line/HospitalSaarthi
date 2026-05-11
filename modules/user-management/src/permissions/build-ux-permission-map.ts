import type { Value } from "@cerbos/core";
import type { FastifyRequest } from "fastify";
import { buildCerbosUserMgmtResourceAttr } from "../authz/cerbos-resource-attr.js";
import type { UserRepository } from "../ports/index.js";

/**
 * Shell / nav permission map (module → feature → action → allowed).
 * Values come from Cerbos {@link FastifyRequest.checkResource} — UX only; PDP remains authoritative on APIs.
 */
export type PermissionUxMap = Record<string, Record<string, Record<string, boolean>>>;

export type BuildUxPermissionMapDeps = {
  userRepository: UserRepository;
  getTenantId: (request: FastifyRequest) => string;
  getUserId: (request: FastifyRequest) => string;
};

async function userRowResourceAttr(
  userRepository: UserRepository,
  tenantId: string,
  userId: string,
): Promise<Record<string, Value>> {
  const u = await userRepository.getUserById(tenantId, userId);
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: tenantId,
    department: u?.department ?? null,
    required_clearance: u?.clearance_tier_required ?? 0,
    org_id: u?.org_id ?? null,
  });
}

/**
 * Runs a fixed set of Cerbos checks and maps results into the SPA permission map shape
 * documented in the frontend LLD (`hasModuleAccess` / `hasFeaturePermission`).
 */
export async function buildUxPermissionMap(
  request: FastifyRequest,
  deps: BuildUxPermissionMapDeps,
): Promise<PermissionUxMap> {
  const tenantId = deps.getTenantId(request);
  const userId = deps.getUserId(request);
  const tenantOnly = buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: tenantId,
    department: null,
    required_clearance: 0,
  });
  const selfAttr = await userRowResourceAttr(deps.userRepository, tenantId, userId);
  const check = request.checkResource.bind(request);

  const allow = async (kind: string, id: string, action: string, attr?: Record<string, Value>) =>
    Boolean((await check(kind, id, action, attr)).isAllowed(action));

  const listOk = await allow("user", "list", "user.list", tenantOnly);
  const readSelfOk = await allow("user", userId, "user.read", selfAttr);
  const createOk = await allow("user", "new", "user.create", tenantOnly);
  const updateSelfOk = await allow("user", userId, "user.update", selfAttr);
  const deleteSelfOk = await allow("user", userId, "user.delete", selfAttr);
  const assignOk = await allow("role_assignment", "new", "role.assign", tenantOnly);
  const revokeOk = await allow("role_assignment", "revoke", "role.revoke", tenantOnly);

  return {
    "user-management": {
      users: {
        read: listOk || readSelfOk,
        write: createOk || updateSelfOk || deleteSelfOk,
      },
      roles: {
        read: assignOk || revokeOk,
        write: assignOk,
      },
    },
  };
}
