/**
 * Canonical Cerbos resource attributes for User Management ABAC (resource side).
 * Every PEP target must include tenant, department, and clearance sensitivity so
 * policies and PlanResources never see a partially specified resource.
 */

import type { Value } from "@cerbos/core";

export type CerbosUserMgmtResourceAttrInput = {
  iq_tenant_id: string;
  /** Target row department, or null for synthetic resources (list/create). */
  department: string | null;
  /**
   * Minimum principal clearance tier (0–3) required for sensitive read/update/delete.
   * Always set (use 0 when not applicable).
   */
  required_clearance: number;
  /** Present on concrete `user` rows; omit on synthetic / `role_assignment` targets. */
  org_id?: string | null;
};

/**
 * Builds the attribute map sent to Cerbos `resource.attr` for `user` and `role_assignment` kinds.
 */
export function buildCerbosUserMgmtResourceAttr(
  input: CerbosUserMgmtResourceAttrInput,
): Record<string, Value> {
  const out: Record<string, Value> = {
    iq_tenant_id: input.iq_tenant_id,
    department: input.department,
    required_clearance: input.required_clearance,
  };
  if (input.org_id !== undefined) {
    out.org_id = input.org_id;
  }
  return out;
}
