import type { OrganizationRepo } from "../ports.js";
import type { Organization } from "../domain/organization.types.js";

export async function getOrganizationById(
  organizationRepo: OrganizationRepo,
  id: string,
): Promise<Organization | null> {
  const row = await organizationRepo.findById(id);
  return row ?? null;
}
