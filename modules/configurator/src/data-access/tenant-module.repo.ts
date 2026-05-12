import { eq, and, type DbInstance, type SQL } from "@hims/ts-sdk-db";
import type { TenantModuleRepo } from "../ports.js";
import type {
  TenantModule,
  CreateTenantModuleData,
  UpdateTenantModuleData,
  TenantModuleFilters,
  TenantModuleKey,
} from "../domain/tenant-module.types.js";
import { tenantModules } from "../schema/tables.js";
import { omitUndefined } from "./utils.js";

export class DrizzleTenantModuleRepo implements TenantModuleRepo {
  constructor(private readonly db: DbInstance) {}

  async findAll(filters: TenantModuleFilters): Promise<TenantModule[]> {
    const conditions: SQL[] = [eq(tenantModules.iq_tenant_id, filters.iq_tenant_id)];

    if (filters.is_enabled !== undefined) {
      conditions.push(eq(tenantModules.is_enabled, filters.is_enabled));
    }

    return this.db
      .select()
      .from(tenantModules)
      .where(and(...conditions)) as unknown as TenantModule[];
  }

  async findByKey(key: TenantModuleKey): Promise<TenantModule | undefined> {
    const rows = await this.db
      .select()
      .from(tenantModules)
      .where(
        and(
          eq(tenantModules.iq_tenant_id, key.iq_tenant_id),
          eq(tenantModules.module_id, key.module_id),
        ),
      )
      .limit(1);

    return rows[0] as TenantModule | undefined;
  }

  async create(data: CreateTenantModuleData): Promise<TenantModule> {
    const isEnabled = data.is_enabled ?? true;
    const now = new Date();

    const rows = await this.db
      .insert(tenantModules)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        module_id: data.module_id,
        is_enabled: isEnabled,
        is_core_override: data.is_core_override ?? false,
        enabled_at: isEnabled ? now : null,
        disabled_at: isEnabled ? null : now,
        enabled_by: data.enabled_by ?? null,
        updated_by: data.updated_by ?? data.enabled_by ?? null,
      })
      .returning();

    return rows[0] as TenantModule;
  }

  async update(
    key: TenantModuleKey,
    data: UpdateTenantModuleData,
  ): Promise<TenantModule | undefined> {
    const patch = omitUndefined(data as Record<string, unknown>);
    const rows = await this.db
      .update(tenantModules)
      .set({
        ...patch,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(tenantModules.iq_tenant_id, key.iq_tenant_id),
          eq(tenantModules.module_id, key.module_id),
        ),
      )
      .returning();

    return rows[0] as TenantModule | undefined;
  }

  async delete(key: TenantModuleKey): Promise<boolean> {
    const rows = await this.db
      .delete(tenantModules)
      .where(
        and(
          eq(tenantModules.iq_tenant_id, key.iq_tenant_id),
          eq(tenantModules.module_id, key.module_id),
        ),
      )
      .returning();

    return rows.length > 0;
  }
}
