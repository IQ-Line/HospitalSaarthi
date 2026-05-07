import type { OrganizationRepo } from "../ports.js";
import type {
  Organization,
  OrganizationFilters,
} from "../domain/organization.types.js";

export async function listOrganizations(
  repo: OrganizationRepo,
  filters?: OrganizationFilters,
): Promise<Organization[]> {
  return repo.findAll(filters);
}
