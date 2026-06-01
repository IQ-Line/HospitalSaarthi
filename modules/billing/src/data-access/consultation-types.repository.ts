import { and, eq, type DbInstance } from "@hims/ts-sdk-db";
import {
  DEFAULT_CONSULTATION_TYPE_CODE,
  type ConsultationTypeRow,
} from "../domain/consultation-types.types.js";
import type { ConsultationTypesRepo } from "../ports.js";
import { consultationTypes } from "../schema/tables.js";

function toRow(row: typeof consultationTypes.$inferSelect): ConsultationTypeRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    code: row.code,
    display_name: row.display_name,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

class DrizzleConsultationTypesRepository implements ConsultationTypesRepo {
  constructor(private readonly db: DbInstance) {}

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select({
        id: consultationTypes.id,
        code: consultationTypes.code,
        display_name: consultationTypes.display_name,
      })
      .from(consultationTypes)
      .where(
        and(
          eq(consultationTypes.iq_tenant_id, tenantId),
          eq(consultationTypes.id, id),
          eq(consultationTypes.is_active, true),
        ),
      )
      .limit(1);
    return row;
  }

  async listActive(tenantId: string) {
    const rows = await this.db
      .select({
        id: consultationTypes.id,
        code: consultationTypes.code,
        display_name: consultationTypes.display_name,
      })
      .from(consultationTypes)
      .where(
        and(
          eq(consultationTypes.iq_tenant_id, tenantId),
          eq(consultationTypes.is_active, true),
        ),
      )
      .orderBy(consultationTypes.display_name);
    return rows;
  }

  async ensureDefaultTypes(tenantId: string) {
    const [existing] = await this.db
      .select({ id: consultationTypes.id })
      .from(consultationTypes)
      .where(
        and(
          eq(consultationTypes.iq_tenant_id, tenantId),
          eq(consultationTypes.code, DEFAULT_CONSULTATION_TYPE_CODE),
        ),
      )
      .limit(1);
    if (existing) return;

    await this.db.insert(consultationTypes).values({
      iq_tenant_id: tenantId,
      code: DEFAULT_CONSULTATION_TYPE_CODE,
      display_name: "General Consultation",
      is_active: true,
    });
  }
}

const memoryByTenant = new Map<string, ConsultationTypeRow[]>();

function createInMemoryConsultationTypesRepo(): ConsultationTypesRepo {
  return {
    listActive: async (tenantId) => {
      const rows = memoryByTenant.get(tenantId) ?? [];
      return rows
        .filter((r) => r.is_active)
        .map((r) => ({ id: r.id, code: r.code, display_name: r.display_name }));
    },
    findById: async (tenantId, id) => {
      const row = memoryByTenant.get(tenantId)?.find((r) => r.id === id && r.is_active);
      return row ? { id: row.id, code: row.code, display_name: row.display_name } : undefined;
    },
    ensureDefaultTypes: async (tenantId) => {
      const rows = memoryByTenant.get(tenantId) ?? [];
      if (rows.some((r) => r.code === DEFAULT_CONSULTATION_TYPE_CODE)) return;
      const now = new Date().toISOString();
      const row: ConsultationTypeRow = {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
        iq_tenant_id: tenantId,
        code: DEFAULT_CONSULTATION_TYPE_CODE,
        display_name: "General Consultation",
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      memoryByTenant.set(tenantId, [...rows, row]);
    },
  };
}

export function seedMemoryConsultationType(tenantId: string, row: ConsultationTypeRow): void {
  const rows = memoryByTenant.get(tenantId) ?? [];
  if (!rows.some((r) => r.id === row.id)) {
    memoryByTenant.set(tenantId, [...rows, row]);
  }
}

export function createConsultationTypesRepo(
  source: DbInstance | "memory",
): ConsultationTypesRepo {
  return source === "memory"
    ? createInMemoryConsultationTypesRepo()
    : new DrizzleConsultationTypesRepository(source);
}
