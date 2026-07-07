import type { Value } from "@cerbos/core";
import type { Principal } from "@hims/ts-sdk-identity";

/**
 * Maps the shared identity {@link Principal} to Cerbos `principal.attr` (LLD PEP enrichment §7).
 *
 * User Management (and similar modules) should base PDP rules on these attributes — tenant
 * (`iq_tenant_id`), `capabilities`, `delegated_capabilities`, `clearances`,
 * `um_clearance_effective_tier`, `department`, `org_id` — not on `Principal.roles` from identity alone.
 * The PEP still passes `roles` on the Cerbos principal wire object for context compatibility; policies
 * must not grant access from roles alone without attribute/capability checks.
 */
export function principalAttrsForCerbos(principal: Principal): Record<string, Value> {
  const orgTrim =
    principal.orgId !== undefined && principal.orgId !== null
      ? String(principal.orgId).trim()
      : "";
  const deptTrim =
    principal.department !== undefined && principal.department !== null
      ? String(principal.department).trim()
      : "";
  const roleCodes = (principal.roles ?? [])
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
  return {
    iq_tenant_id: principal.tenantId,
    org_id: orgTrim.length > 0 ? orgTrim : null,
    department: deptTrim.length > 0 ? deptTrim : null,
    role_codes: roleCodes,
    // Bounded platform authority. Always present (default `[]`) so PDP rules can reference
    // `request.principal.attr.scopes` without a `has()` guard, exactly like `capabilities`.
    scopes: principal.scopes ?? [],
    capabilities: principal.capabilities ?? [],
    delegated_capabilities: principal.delegatedCapabilities ?? [],
    clearances: principal.clearances ?? {},
    um_clearance_effective_tier: principal.umClearanceEffectiveTier ?? 0,
  };
}
