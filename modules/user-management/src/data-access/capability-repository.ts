import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, or } from "drizzle-orm";
import { assertValidRuntimeCapabilityRow } from "../domain/capability-key.js";
import { projectCapabilityRowToCanonical } from "../domain/legacy-capability-key-remap.js";
import { normalizeCapabilityProvenance } from "../domain/capability-provenance.js";
import { assertValidModuleSlug, normalizeModuleSlugSet } from "../domain/module-slug.js";
import type { Capability, CapabilityRepository } from "../ports/index.js";
import { capabilities } from "../schema/tables.js";

export type CapabilityDbRow = {
  id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  source_module_slug: string | null;
  source_permission_slug: string | null;
  source_catalog: string | null;
};

export function mapCapabilityRowFromDb(row: CapabilityDbRow): Capability {
  const projected = projectCapabilityRowToCanonical(row);
  const module = assertValidModuleSlug(projected.module, "capabilities.module");
  const provenance = normalizeCapabilityProvenance({
    source_module_slug: projected.source_module_slug,
    source_permission_slug: projected.source_permission_slug,
    source_catalog: projected.source_catalog,
  });
  const capability = {
    id: projected.id,
    capability_key: projected.capability_key,
    module,
    feature: projected.feature,
    action: projected.action,
    display_name: projected.display_name,
    description: projected.description,
    is_active: projected.is_active,
    ...provenance,
  };
  assertValidRuntimeCapabilityRow(capability, `capabilities.id=${row.id}`);
  return capability;
}

export const capabilitySelectColumns = {
  id: capabilities.id,
  capability_key: capabilities.capability_key,
  module: capabilities.module,
  feature: capabilities.feature,
  action: capabilities.action,
  display_name: capabilities.display_name,
  description: capabilities.description,
  is_active: capabilities.is_active,
  source_module_slug: capabilities.source_module_slug,
  source_permission_slug: capabilities.source_permission_slug,
  source_catalog: capabilities.source_catalog,
} as const;

export class DrizzleCapabilityRepository implements CapabilityRepository {
  constructor(private readonly db: DbInstance) {}

  async getCapabilityById(capabilityId: string): Promise<Capability | null> {
    const [row] = await this.db
      .select(capabilitySelectColumns)
      .from(capabilities)
      .where(eq(capabilities.id, capabilityId))
      .limit(1);
    return row ? mapCapabilityRowFromDb(row) : null;
  }

  async listCapabilities(): Promise<Capability[]> {
    const rows = await this.db.select(capabilitySelectColumns).from(capabilities);
    return rows.map(mapCapabilityRowFromDb);
  }

  async listCapabilitiesByIds(capabilityIds: string[]): Promise<Capability[]> {
    if (capabilityIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(capabilitySelectColumns)
      .from(capabilities)
      .where(inArray(capabilities.id, capabilityIds));
    return rows.map(mapCapabilityRowFromDb);
  }

  async listCapabilitiesByKeys(capabilityKeys: string[]): Promise<Capability[]> {
    if (capabilityKeys.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(capabilitySelectColumns)
      .from(capabilities)
      .where(inArray(capabilities.capability_key, capabilityKeys));
    return rows.map(mapCapabilityRowFromDb);
  }

  async listActiveRuntimeCapabilitiesByModuleSlugs(moduleSlugs: string[]): Promise<Capability[]> {
    const normalized = normalizeModuleSlugSet(moduleSlugs);
    if (normalized.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(capabilitySelectColumns)
      .from(capabilities)
      .where(
        and(
          or(
            inArray(capabilities.module, normalized),
            inArray(capabilities.source_module_slug, normalized),
          ),
          eq(capabilities.is_active, true),
        ),
      );
    return rows.map(mapCapabilityRowFromDb);
  }
}
