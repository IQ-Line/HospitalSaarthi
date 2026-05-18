import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray } from "drizzle-orm";
import type {
  Capability,
  ReplaceRoleCapabilitiesInput,
  RoleCapabilityRepository,
} from "../ports/index.js";
import { capabilities, role_capabilities } from "../schema/tables.js";

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

export class DrizzleRoleCapabilityRepository implements RoleCapabilityRepository {
  constructor(private readonly db: DbInstance) {}

  async listCapabilitiesByRole(tenantId: string, roleId: string): Promise<Capability[]> {
    const rows = await this.db
      .select(capabilityColumns)
      .from(role_capabilities)
      .innerJoin(
        capabilities,
        eq(role_capabilities.capability_id, capabilities.id),
      )
      .where(
        and(
          eq(role_capabilities.iq_tenant_id, tenantId),
          eq(role_capabilities.role_id, roleId),
        ),
      );
    return rows.map(rowToCapability);
  }

  async replaceCapabilitiesForRole(
    tenantId: string,
    roleId: string,
    input: ReplaceRoleCapabilitiesInput,
  ): Promise<Capability[]> {
    const capabilityIds = [...new Set(input.capability_ids)];

    await this.db
      .delete(role_capabilities)
      .where(and(eq(role_capabilities.iq_tenant_id, tenantId), eq(role_capabilities.role_id, roleId)));

    if (capabilityIds.length > 0) {
      await this.db.insert(role_capabilities).values(
        capabilityIds.map((capabilityId) => ({
          iq_tenant_id: tenantId,
          role_id: roleId,
          capability_id: capabilityId,
        })),
      );
    }

    if (capabilityIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select(capabilityColumns)
      .from(capabilities)
      .where(inArray(capabilities.id, capabilityIds));
    return rows.map(rowToCapability);
  }
}
