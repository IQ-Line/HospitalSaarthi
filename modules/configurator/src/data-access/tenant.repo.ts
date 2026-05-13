import { eq, and, isNull, type DbInstance, type SQL } from "@hims/ts-sdk-db";
import type { TenantRepo } from "../ports.js";
import type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  TenantFilters,
} from "../domain/tenant.types.js";
import { tenants } from "../schema/tables.js";
import { omitUndefined } from "./utils.js";

export class DrizzleTenantRepo implements TenantRepo {
  constructor(private readonly db: DbInstance) {}

  async findAll(filters?: TenantFilters): Promise<Tenant[]> {
    const conditions: SQL[] = [];

    if (filters?.org_id) {
      conditions.push(eq(tenants.org_id, filters.org_id));
    }
    if (filters?.is_root) {
      conditions.push(isNull(tenants.parent_tenant_id));
    }
    if (filters?.parent_tenant_id) {
      conditions.push(eq(tenants.parent_tenant_id, filters.parent_tenant_id));
    }
    if (filters?.provisioning_status) {
      conditions.push(eq(tenants.provisioning_status, filters.provisioning_status));
    }
    if (filters?.type) {
      conditions.push(eq(tenants.type, filters.type));
    }

    const query = this.db.select().from(tenants);

    if (conditions.length > 0) {
      return query.where(and(...conditions)) as unknown as Tenant[];
    }

    return query as unknown as Tenant[];
  }

  async findById(id: string): Promise<Tenant | undefined> {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.iq_tenant_id, id))
      .limit(1);

    return rows[0] as Tenant | undefined;
  }

  async findBySlug(slug: string): Promise<Tenant | undefined> {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    return rows[0] as Tenant | undefined;
  }

  async findByOrgId(orgId: string): Promise<Tenant[]> {
    return this.db
      .select()
      .from(tenants)
      .where(eq(tenants.org_id, orgId)) as unknown as Tenant[];
  }

  async findByOrgIdAndBranchCode(
    orgId: string,
    branchCode: string,
  ): Promise<Tenant | undefined> {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.org_id, orgId), eq(tenants.branch_code, branchCode)))
      .limit(1);

    return rows[0] as Tenant | undefined;
  }

  async create(data: CreateTenantData): Promise<Tenant> {
    const rows = await this.db
      .insert(tenants)
      .values({
        org_id: data.org_id,
        parent_tenant_id: data.parent_tenant_id ?? null,
        name: data.name,
        slug: data.slug,
        type: data.type,
        provisioning_status: data.provisioning_status ?? "provisioning",
        data_isolation_level: data.data_isolation_level ?? "shared",
        cerbos_scope_key: data.cerbos_scope_key,
        timezone: data.timezone ?? "Asia/Kolkata",
        locale: data.locale ?? "en-IN",
        metadata: data.metadata ?? null,
        branch_code: data.branch_code?.trim() ?? null,
        branch_type: data.branch_type ?? null,
        address_line1: data.address_line1?.trim() ?? null,
        city: data.city?.trim() ?? null,
        state: data.state?.trim() ?? null,
        pin_code: data.pin_code?.trim() ?? null,
        contact_phone: data.contact_phone?.trim() ?? null,
        contact_email: data.contact_email?.trim() ?? null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();

    return rows[0] as Tenant;
  }

  async update(
    id: string,
    data: UpdateTenantData,
  ): Promise<Tenant | undefined> {
    const patch = omitUndefined(data as Record<string, unknown>);
    const rows = await this.db
      .update(tenants)
      .set({
        ...patch,
        updated_at: new Date(),
      })
      .where(eq(tenants.iq_tenant_id, id))
      .returning();

    return rows[0] as Tenant | undefined;
  }
}
