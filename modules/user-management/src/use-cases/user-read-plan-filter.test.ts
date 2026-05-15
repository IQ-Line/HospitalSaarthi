import { describe, expect, it } from "vitest";
import {
  PlanExpression,
  PlanExpressionValue,
  PlanExpressionVariable,
  PlanKind,
} from "@cerbos/core";
import type { User } from "../ports/index.js";
import { filterUsersMatchingUserReadPlan } from "./user-read-plan-filter.js";

const basePlanFields = {
  requestId: "req",
  cerbosCallId: "cid",
  validationErrors: [] as const,
  metadata: undefined,
};

function user(
  partial: Pick<User, "id"> & Partial<Omit<User, "id">>,
): User {
  return {
    id: partial.id,
    full_name: partial.full_name ?? "n",
    status: partial.status ?? "active",
    org_id: partial.org_id ?? null,
    department: partial.department ?? null,
    clearance_tier_required: partial.clearance_tier_required ?? 0,
    email: partial.email,
    phone: partial.phone,
    auth_user_id: partial.auth_user_id,
    username: partial.username,
  };
}

describe("filterUsersMatchingUserReadPlan", () => {
  const users: User[] = [
    user({ id: "1", department: "cardiology" }),
    user({ id: "2", department: "surgery" }),
    user({ id: "3", department: null }),
  ];

  const tenantId = "t1";
  const principalAttr = {
    iq_tenant_id: tenantId,
    department: "cardiology",
    capabilities: ["um:user:read"],
    delegated_capabilities: [] as string[],
    clearances: { L1: "1" },
    um_clearance_effective_tier: 2,
  };

  it("returns all rows for KIND_ALWAYS_ALLOWED", () => {
    const plan = {
      ...basePlanFields,
      kind: PlanKind.ALWAYS_ALLOWED as const,
    };
    expect(filterUsersMatchingUserReadPlan(users, plan, tenantId, principalAttr)).toEqual(users);
  });

  it("returns none for KIND_ALWAYS_DENIED", () => {
    const plan = {
      ...basePlanFields,
      kind: PlanKind.ALWAYS_DENIED as const,
    };
    expect(filterUsersMatchingUserReadPlan(users, plan, tenantId, principalAttr)).toEqual([]);
  });

  it("filters by conditional eq on request.resource.attr.department", () => {
    const condition = new PlanExpression("eq", [
      new PlanExpressionVariable("request.resource.attr.department"),
      new PlanExpressionValue("cardiology"),
    ]);
    const plan = {
      ...basePlanFields,
      kind: PlanKind.CONDITIONAL as const,
      condition,
    };
    const out = filterUsersMatchingUserReadPlan(users, plan, tenantId, principalAttr);
    expect(out.map((u) => u.id)).toEqual(["1"]);
  });

  it("evaluates compound clearance-style expression", () => {
    const tierRequired = new PlanExpressionVariable("request.resource.attr.required_clearance");
    const tierPrincipal = new PlanExpressionVariable("request.principal.attr.um_clearance_effective_tier");
    const clearanceOk = new PlanExpression("or", [
      new PlanExpression("lte", [tierRequired, new PlanExpressionValue(0)]),
      new PlanExpression("and", [
        new PlanExpression("gt", [tierRequired, new PlanExpressionValue(0)]),
        new PlanExpression("gte", [tierPrincipal, tierRequired]),
        new PlanExpression("gt", [
          new PlanExpression("size", [
            new PlanExpressionVariable("request.principal.attr.clearances"),
          ]),
          new PlanExpressionValue(0),
        ]),
      ]),
    ]);
    const plan = {
      ...basePlanFields,
      kind: PlanKind.CONDITIONAL as const,
      condition: clearanceOk,
    };

    const sensitive = user({ id: "s", clearance_tier_required: 2 });
    const plain = user({ id: "p", clearance_tier_required: 0 });
    const list = [sensitive, plain];

    const out = filterUsersMatchingUserReadPlan(list, plan, tenantId, principalAttr);
    expect(out.map((u) => u.id).sort()).toEqual(["p", "s"]);
  });
});
