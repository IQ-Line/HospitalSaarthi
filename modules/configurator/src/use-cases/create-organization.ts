import { ConfiguratorError } from "../errors.js";
import type { OrganizationRepo } from "../ports.js";
import type {
  CreateOrganizationData,
  Organization,
  OrganizationType,
} from "../domain/organization.types.js";

const ORG_TYPES = new Set<OrganizationType>([
  "hospital_chain",
  "medical_college",
  "standalone_hospital",
  "government_network",
]);

export async function createOrganization(
  organizationRepo: OrganizationRepo,
  data: CreateOrganizationData,
): Promise<Organization> {
  const name = data.name?.trim() ?? "";
  const slug = data.slug?.trim() ?? "";
  if (!name || !slug || !data.type) {
    throw new ConfiguratorError(400, "name, slug, and type are required");
  }
  if (!ORG_TYPES.has(data.type)) {
    throw new ConfiguratorError(400, "invalid organization type");
  }

  const existing = await organizationRepo.findBySlug(slug);
  if (existing) {
    throw new ConfiguratorError(409, "organization slug already exists", "CONFLICT");
  }

  return organizationRepo.create({
    ...data,
    name,
    slug,
    status: data.status ?? "active",
  });
}
