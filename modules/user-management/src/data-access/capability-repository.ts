import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray } from "drizzle-orm";
import { assertValidRuntimeCapabilityRow } from "../domain/capability-key.js";
import { normalizeCapabilityProvenance } from "../domain/capability-provenance.js";
import { assertValidModuleSlug, normalizeModuleSlugSet } from "../domain/module-slug.js";
import type { Capability, CapabilityRepository } from "../ports/index.js";
import { capabilities } from "../schema/tables.js";

function rowToCapability(row: {
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
}): Capability {
  const module = assertValidModuleSlug(row.module, "capabilities.module");
  const provenance = normalizeCapabilityProvenance({
    source_module_slug: row.source_module_slug,
    source_permission_slug: row.source_permission_slug,
    source_catalog: row.source_catalog,
  });
  const capability = {
    id: row.id,
    capability_key: row.capability_key,
    module,
    feature: row.feature,
    action: row.action,
    display_name: row.display_name,
    description: row.description,
    is_active: row.is_active,
    ...provenance,
  };
  assertValidRuntimeCapabilityRow(capability, `capabilities.id=${row.id}`);
  return capability;
}

const capabilityColumns = {
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
      .select(capabilityColumns)
      .from(capabilities)
      .where(eq(capabilities.id, capabilityId))
      .limit(1);
    return row ? rowToCapability(row) : null;
  }

  async listCapabilities(): Promise<Capability[]> {
    const rows = await this.db.select(capabilityColumns).from(capabilities);
    return rows.map(rowToCapability);
  }

  async listCapabilitiesByIds(capabilityIds: string[]): Promise<Capability[]> {
    if (capabilityIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(capabilityColumns)
      .from(capabilities)
      .where(inArray(capabilities.id, capabilityIds));
    return rows.map(rowToCapability);
  }

  async listCapabilitiesByKeys(capabilityKeys: string[]): Promise<Capability[]> {
    if (capabilityKeys.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(capabilityColumns)
      .from(capabilities)
      .where(inArray(capabilities.capability_key, capabilityKeys));
    return rows.map(rowToCapability);
  }

  async listActiveRuntimeCapabilitiesByModuleSlugs(moduleSlugs: string[]): Promise<Capability[]> {
    const normalized = normalizeModuleSlugSet(moduleSlugs);
    if (normalized.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(capabilityColumns)
      .from(capabilities)
      .where(and(inArray(capabilities.module, normalized), eq(capabilities.is_active, true)));
    return rows.map(rowToCapability);
  }
}
