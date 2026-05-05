import type { AuthContext, Principal, PrincipalService } from "../ports.js";

export type GetPrincipalDeps = {
  principalService: PrincipalService;
};

/**
 * Returns the PEP-enriched principal for the given verified auth context (JWT `sub` + tenant).
 */
export async function getPrincipal(deps: GetPrincipalDeps, context: AuthContext): Promise<Principal> {
  return deps.principalService.getPrincipal(context);
}
