import type { UserRepo } from "../ports.js";
import type { User, UserFilters } from "../domain/user.types.js";

export async function listUsers(
  repo: UserRepo,
  tenantId: string,
  filters?: UserFilters,
): Promise<{ data: User[]; total: number }> {
  return repo.findAll(tenantId, filters);
}
