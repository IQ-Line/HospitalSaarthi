import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray } from "drizzle-orm";
import type {
  Capability,
  ReplaceRoleCapabilitiesInput,
  RoleCapabilityRepository,
} from "../ports/index.js";
import {
  capabilitySelectColumns,
  mapCapabilityRowFromDb,
} from "./capability-repository.js";
import { capabilities, role_capabilities } from "../schema/tables.js";

export class DrizzleRoleCapabilityRepository implements RoleCapabilityRepository {
  constructor(private readonly db: DbInstance) {}

  async listCapabilitiesByRole(tenantId: string, roleId: string): Promise<Capability[]> {
    const rows = await this.db
      .select(capabilitySelectColumns)
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
    return rows.map(mapCapabilityRowFromDb);
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
      .select(capabilitySelectColumns)
      .from(capabilities)
      .where(inArray(capabilities.id, capabilityIds));
    return rows.map(mapCapabilityRowFromDb);
  }
}
