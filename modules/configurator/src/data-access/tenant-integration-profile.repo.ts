import { eq, and, type DbInstance, type SQL } from "@hims/ts-sdk-db";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import type {
  TenantIntegrationProfile,
  CreateTenantIntegrationProfileData,
  UpdateTenantIntegrationProfileData,
  TenantIntegrationProfileFilters,
  IntegrationKind,
} from "../domain/tenant-integration-profile.types.js";
import { tenantIntegrationProfiles } from "../schema/tables.js";
import { omitUndefined } from "./utils.js";

export class DrizzleTenantIntegrationProfilesRepo
  implements TenantIntegrationProfilesRepo
{
  constructor(private readonly db: DbInstance) {}

  async findAll(
    filters: TenantIntegrationProfileFilters,
  ): Promise<TenantIntegrationProfile[]> {
    const conditions: SQL[] = [
      eq(tenantIntegrationProfiles.iq_tenant_id, filters.iq_tenant_id),
    ];

    if (filters.integration_kind !== undefined) {
      conditions.push(
        eq(tenantIntegrationProfiles.integration_kind, filters.integration_kind),
      );
    }
    if (filters.is_active !== undefined) {
      conditions.push(eq(tenantIntegrationProfiles.is_active, filters.is_active));
    }

    return this.db
      .select()
      .from(tenantIntegrationProfiles)
      .where(and(...conditions)) as unknown as TenantIntegrationProfile[];
  }

  async findById(id: string): Promise<TenantIntegrationProfile | undefined> {
    const rows = await this.db
      .select()
      .from(tenantIntegrationProfiles)
      .where(eq(tenantIntegrationProfiles.id, id))
      .limit(1);

    return rows[0] as TenantIntegrationProfile | undefined;
  }

  async findActiveByTenantId(
    iqTenantId: string,
    integrationKind: IntegrationKind,
  ): Promise<TenantIntegrationProfile | undefined> {
    const rows = await this.db
      .select()
      .from(tenantIntegrationProfiles)
      .where(
        and(
          eq(tenantIntegrationProfiles.iq_tenant_id, iqTenantId),
          eq(tenantIntegrationProfiles.integration_kind, integrationKind),
          eq(tenantIntegrationProfiles.is_active, true),
        ),
      )
      .limit(1);

    return rows[0] as TenantIntegrationProfile | undefined;
  }

  async findActiveByHipId(
    hipId: string,
    integrationKind: IntegrationKind,
  ): Promise<TenantIntegrationProfile | undefined> {
    const rows = await this.db
      .select()
      .from(tenantIntegrationProfiles)
      .where(
        and(
          eq(tenantIntegrationProfiles.hip_id, hipId),
          eq(tenantIntegrationProfiles.integration_kind, integrationKind),
          eq(tenantIntegrationProfiles.is_active, true),
        ),
      )
      .limit(1);

    return rows[0] as TenantIntegrationProfile | undefined;
  }

  async findAllActiveByKind(
    integrationKind: IntegrationKind,
  ): Promise<TenantIntegrationProfile[]> {
    return this.db
      .select()
      .from(tenantIntegrationProfiles)
      .where(
        and(
          eq(tenantIntegrationProfiles.integration_kind, integrationKind),
          eq(tenantIntegrationProfiles.is_active, true),
        ),
      ) as unknown as TenantIntegrationProfile[];
  }

  async create(
    data: CreateTenantIntegrationProfileData,
  ): Promise<TenantIntegrationProfile> {
    const rows = await this.db
      .insert(tenantIntegrationProfiles)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        integration_kind: data.integration_kind,
        is_active: data.is_active ?? true,
        hip_id: data.hip_id,
        hiu_id: data.hiu_id,
        cm_id: data.cm_id ?? "sbx",
        client_id: data.client_id ?? null,
        client_secret: data.client_secret ?? null,
        default_sms_phone: data.default_sms_phone ?? null,
        hip_display_name: data.hip_display_name ?? null,
        callback_base_url: data.callback_base_url ?? null,
        sms_provider: data.sms_provider ?? null,
        sms_config: data.sms_config ?? {},
        gateway_environment: data.gateway_environment ?? "sandbox",
        created_by: data.created_by ?? null,
        updated_by: data.updated_by ?? data.created_by ?? null,
      })
      .returning();

    return rows[0] as TenantIntegrationProfile;
  }

  async update(
    id: string,
    iqTenantId: string,
    data: UpdateTenantIntegrationProfileData,
  ): Promise<TenantIntegrationProfile | undefined> {
    const patch = omitUndefined(data as Record<string, unknown>);
    const rows = await this.db
      .update(tenantIntegrationProfiles)
      .set({
        ...patch,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(tenantIntegrationProfiles.id, id),
          eq(tenantIntegrationProfiles.iq_tenant_id, iqTenantId),
        ),
      )
      .returning();

    return rows[0] as TenantIntegrationProfile | undefined;
  }

  async delete(id: string, iqTenantId: string): Promise<boolean> {
    const rows = await this.db
      .delete(tenantIntegrationProfiles)
      .where(
        and(
          eq(tenantIntegrationProfiles.id, id),
          eq(tenantIntegrationProfiles.iq_tenant_id, iqTenantId),
        ),
      )
      .returning();

    return rows.length > 0;
  }
}
