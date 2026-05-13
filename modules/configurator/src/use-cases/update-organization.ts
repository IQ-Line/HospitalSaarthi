import { ConfiguratorError } from "../errors.js";
import type { OrganizationRepo } from "../ports.js";
import type {
  Organization,
  OrganizationType,
  UpdateOrganizationData,
} from "../domain/organization.types.js";

const ORG_TYPES = new Set<OrganizationType>([
  "hospital_chain",
  "medical_college",
  "standalone_hospital",
  "government_network",
]);

export async function updateOrganization(
  organizationRepo: OrganizationRepo,
  id: string,
  data: UpdateOrganizationData,
): Promise<Organization | null> {
  const existing = await organizationRepo.findById(id);
  if (!existing) {
    return null;
  }

  if (data.type !== undefined && !ORG_TYPES.has(data.type)) {
    throw new ConfiguratorError(400, "invalid organization type");
  }

  if (data.slug !== undefined) {
    const slug = data.slug.trim();
    if (!slug) {
      throw new ConfiguratorError(400, "slug cannot be empty");
    }
    if (slug.length < 3) {
      throw new ConfiguratorError(400, "slug must be at least 3 characters");
    }
    const slugOwner = await organizationRepo.findBySlug(slug);
    if (slugOwner && slugOwner.id !== id) {
      throw new ConfiguratorError(409, "organization slug already exists", "CONFLICT");
    }
    data = { ...data, slug };
  }

  const updated = await organizationRepo.update(id, data);
  return updated ?? null;
}
