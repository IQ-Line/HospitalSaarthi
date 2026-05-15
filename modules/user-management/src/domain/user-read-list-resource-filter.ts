import type { User } from "./types.js";

/**
 * Resource-side ABAC dimensions for `user.read` list filtering, derived from Cerbos principal.attr
 * and aligned with `infra/cerbos/policies/user_management/user.yaml` (department + clearance clauses).
 */
export type UserReadListResourceAbac = {
  principalDepartment: string | null;
  effectiveTier: number;
  hasClearances: boolean;
};

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export function userReadListResourceAbacFromPrincipalAttr(
  principalAttr: Record<string, unknown>,
): UserReadListResourceAbac {
  const principalDepartment = toNonEmptyString(principalAttr.department);
  const rawTier = principalAttr.um_clearance_effective_tier;
  const effectiveTier =
    typeof rawTier === "number" && Number.isFinite(rawTier) ? Math.trunc(rawTier) : 0;
  const clearances = principalAttr.clearances;
  const hasClearances =
    clearances !== null &&
    typeof clearances === "object" &&
    !Array.isArray(clearances) &&
    Object.keys(clearances as Record<string, unknown>).length > 0;

  return { principalDepartment, effectiveTier, hasClearances };
}

/**
 * In-memory / parity check: same semantics as the SQL built for `user.read` list push-down in
 * `DrizzleUserRepository.listUsers` (department + clearance rules).
 */
export function userMatchesReadListResourceAbac(user: User, f: UserReadListResourceAbac): boolean {
  const pDept = f.principalDepartment;
  const rDept = user.department;
  const deptOk =
    rDept === null ||
    rDept === undefined ||
    String(rDept).trim() === "" ||
    pDept === null ||
    pDept === "" ||
    String(rDept).trim() === pDept;

  const req = user.clearance_tier_required ?? 0;
  const tier = f.effectiveTier;
  const clearanceOk =
    req <= 0 || (req > 0 && f.hasClearances && tier >= req);

  return deptOk && clearanceOk;
}
