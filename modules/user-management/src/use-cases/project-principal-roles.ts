import { compareCanonicalRoleCodes, normalizeRoleCode } from "../domain/normalize-role-code.js";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";

export type ProjectPrincipalRolesDeps = {
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
};

/**
 * Projects persisted role assignments into canonical principal role codes.
 * It does not make authorization decisions.
 */
export async function projectPrincipalRoles(
  deps: ProjectPrincipalRolesDeps,
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const rawCodes = await deps.principalRoleProjectionRepository.listRoleCodesByUser(
    tenantId,
    userId,
  );

  const roleCodeSet = new Set<string>();
  for (const raw of rawCodes) {
    const code = normalizeRoleCode(raw);
    if (code.length > 0) {
      roleCodeSet.add(code);
    }
  }

  return [...roleCodeSet].sort(compareCanonicalRoleCodes);
}
