import type { DbInstance } from "@hims/ts-sdk-db";
import { eq, inArray } from "drizzle-orm";
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
}): Capability {
  return {
    id: row.id,
    capability_key: row.capability_key,
    module: row.module,
    feature: row.feature,
    action: row.action,
    display_name: row.display_name,
    description: row.description,
    is_active: row.is_active,
  };
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
}
