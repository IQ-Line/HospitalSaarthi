import type { FastifyRequest } from "fastify";
import { principalAttrsForCerbos } from "@hims/ts-sdk-authz";
import type { PlanResult } from "@hims/ts-sdk-authz";
import { PlanKind, planResourcesResponseIsConditional } from "@cerbos/core";
import { buildCerbosUserMgmtResourceAttr } from "../authz/cerbos-resource-attr.js";
import { planConditionAllowsUserReadResourceSqlPushdown } from "../data-access/user-read-plan-pushdown.js";
import { userReadListResourceAbacFromPrincipalAttr } from "../domain/user-read-list-resource-filter.js";
import type { User, UserRepository } from "../ports/index.js";
import { filterUsersMatchingUserReadPlan } from "./user-read-plan-filter.js";

export type ListUsersWithAuthzDeps = {
  userRepository: UserRepository;
};

type PepRequest = FastifyRequest & {
  planResources: (
    kind: string,
    action: string,
    attr?: Record<string, unknown>,
  ) => Promise<PlanResult>;
};

function principalAttrPlain(request: FastifyRequest): Record<string, unknown> {
  return JSON.parse(JSON.stringify(principalAttrsForCerbos(request.user))) as Record<string, unknown>;
}

/**
 * Lists tenant users using a single Cerbos {@link PlanResources} call for `user.read`.
 * When the plan AST is supported, applies department + clearance predicates in the repository
 * layer (SQL for Drizzle, in-memory filter for tests). Otherwise falls back to fetching tenant
 * rows and evaluating the plan with {@link filterUsersMatchingUserReadPlan}.
 */
export type ListUsersFilter = {
  department?: string;
};

export async function listUsersWithAuthz(
  request: FastifyRequest,
  deps: ListUsersWithAuthzDeps,
  tenantId: string,
  filter?: ListUsersFilter,
): Promise<User[]> {
  const pep = request as PepRequest;
  const plan = await pep.planResources(
    "user",
    "user.read",
    buildCerbosUserMgmtResourceAttr({
      iq_tenant_id: tenantId,
      department: null,
      required_clearance: 0,
    }),
  );

  if (plan.kind === PlanKind.ALWAYS_DENIED) {
    return [];
  }

  if (plan.kind === PlanKind.ALWAYS_ALLOWED) {
    return deps.userRepository.listUsers(tenantId, { department: filter?.department });
  }

  const principalAttr = principalAttrPlain(request);

  if (
    planResourcesResponseIsConditional(plan) &&
    planConditionAllowsUserReadResourceSqlPushdown(plan.condition)
  ) {
    const abac = userReadListResourceAbacFromPrincipalAttr(principalAttr);
    return deps.userRepository.listUsers(tenantId, { userReadResourceAbac: abac, department: filter?.department });
  }

  const rows = await deps.userRepository.listUsers(tenantId, { department: filter?.department });
  return filterUsersMatchingUserReadPlan(rows, plan, tenantId, principalAttr);
}
