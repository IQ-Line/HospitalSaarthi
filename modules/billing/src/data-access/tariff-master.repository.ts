import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, or, sql, type DbInstance } from "@hims/ts-sdk-db";
import type { ProviderConsultationTariffItemInput } from "../domain/consultation-tariff.types.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import { formatMoney } from "../lib/tariff-api.js";
import { applyTariffPatch, toDbUpdateValues, toTariffRow } from "../lib/tariff-api.js";
import {
  isRegistrationTariffCategory,
  normalizeDepartmentLabel,
} from "../lib/tariff-category.js";
import type {
  TariffMasterRepo,
  TariffMasterUpdatePatch,
  UpsertProviderConsultationTariffInput,
} from "../ports.js";
import { billingMaster } from "../schema/tables.js";

function sameProvider(a: string | null, b: string | null): boolean {
  return a === b;
}

function effectiveAtCondition(at: Date) {
  return and(
    sql`${billingMaster.effective_from} <= ${at}`,
    sql`(${billingMaster.effective_to} IS NULL OR ${billingMaster.effective_to} > ${at})`,
  );
}

function rangesOverlap(
  aFrom: Date,
  aTo: Date | null,
  bFrom: Date,
  bTo: Date | null,
): boolean {
  const aEnd = aTo ?? new Date("9999-12-31T23:59:59.999Z");
  const bEnd = bTo ?? new Date("9999-12-31T23:59:59.999Z");
  return aFrom < bEnd && bFrom < aEnd;
}

class DrizzleTariffMasterRepository implements TariffMasterRepo {
  constructor(private readonly db: DbInstance) {}

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(billingMaster)
      .where(and(eq(billingMaster.iq_tenant_id, tenantId), eq(billingMaster.id, id)))
      .limit(1);
    return row ? toTariffRow(row) : undefined;
  }

  async findByCodeAndProvider(tenantId: string, serviceCode: string, providerId: string | null) {
    const [row] = await this.db
      .select()
      .from(billingMaster)
      .where(
        and(
          eq(billingMaster.iq_tenant_id, tenantId),
          eq(billingMaster.service_code, serviceCode.trim()),
          eq(billingMaster.is_active, true),
          sql`${billingMaster.provider_id} IS NOT DISTINCT FROM ${providerId}`,
          effectiveAtCondition(new Date()),
        ),
      )
      .orderBy(sql`${billingMaster.effective_from} DESC`)
      .limit(1);
    return row ? toTariffRow(row) : undefined;
  }

  async findActiveRegistrationFee(tenantId: string, excludeId?: string) {
    const rows = await this.db
      .select()
      .from(billingMaster)
      .where(
        and(
          eq(billingMaster.iq_tenant_id, tenantId),
          eq(billingMaster.is_active, true),
          sql`${billingMaster.provider_id} IS NULL`,
          sql`lower(${billingMaster.category}) IN ('registration-fee', 'registration')`,
          excludeId ? sql`${billingMaster.id} <> ${excludeId}` : sql`true`,
        ),
      )
      .limit(1);
    return rows[0] ? toTariffRow(rows[0]) : undefined;
  }

  async findActiveProviderDepartmentTariff(tenantId, query) {
    const base = [
      eq(billingMaster.iq_tenant_id, tenantId),
      eq(billingMaster.is_active, true),
      eq(billingMaster.provider_id, query.provider_id),
      query.excludeId ? sql`${billingMaster.id} <> ${query.excludeId}` : sql`true`,
    ];

    const departmentId = query.department_id?.trim() || null;
    const departmentLabel = query.department?.trim()
      ? normalizeDepartmentLabel(query.department)
      : null;

    if (departmentId) {
      const matchConditions = [eq(billingMaster.department_id, departmentId)];
      if (departmentLabel) {
        matchConditions.push(
          and(
            isNull(billingMaster.department_id),
            sql`lower(trim(${billingMaster.department})) = ${departmentLabel}`,
          ),
        );
      }

      const [row] = await this.db
        .select()
        .from(billingMaster)
        .where(and(...base, or(...matchConditions)))
        .limit(1);
      return row ? toTariffRow(row) : undefined;
    }

    if (departmentLabel) {
      const [row] = await this.db
        .select()
        .from(billingMaster)
        .where(
          and(
            ...base,
            isNull(billingMaster.department_id),
            sql`lower(trim(${billingMaster.department})) = ${departmentLabel}`,
          ),
        )
        .limit(1);
      return row ? toTariffRow(row) : undefined;
    }

    return undefined;
  }

  async resolveConsultationTariff(
    tenantId: string,
    providerId: string,
    departmentId: string,
    consultationTypeId: string,
    at = new Date(),
  ) {
    const [row] = await this.db
      .select()
      .from(billingMaster)
      .where(
        and(
          eq(billingMaster.iq_tenant_id, tenantId),
          eq(billingMaster.provider_id, providerId),
          eq(billingMaster.department_id, departmentId),
          eq(billingMaster.consultation_type_id, consultationTypeId),
          eq(billingMaster.is_active, true),
          effectiveAtCondition(at),
        ),
      )
      .orderBy(sql`${billingMaster.effective_from} DESC`)
      .limit(1);
    return row ? toTariffRow(row) : undefined;
  }

  async listProviderConsultationTariffs(tenantId, query) {
    const conditions = [
      eq(billingMaster.iq_tenant_id, tenantId),
      isNotNull(billingMaster.provider_id),
      isNotNull(billingMaster.department_id),
      isNotNull(billingMaster.consultation_type_id),
      eq(billingMaster.is_active, true),
    ];
    if (query.provider_id) {
      conditions.push(eq(billingMaster.provider_id, query.provider_id));
    }
    if (query.department_id) {
      conditions.push(eq(billingMaster.department_id, query.department_id));
    }
    if (query.consultation_type_id) {
      conditions.push(eq(billingMaster.consultation_type_id, query.consultation_type_id));
    }

    const rows = await this.db
      .select()
      .from(billingMaster)
      .where(and(...conditions))
      .orderBy(billingMaster.service_name, billingMaster.id);

    return rows.map(toTariffRow);
  }

  async hasOverlappingConsultationTariff(
    tenantId,
    providerId,
    departmentId,
    consultationTypeId,
    effectiveFrom,
    effectiveTo,
    excludeId,
  ) {
    const rows = await this.db
      .select()
      .from(billingMaster)
      .where(
        and(
          eq(billingMaster.iq_tenant_id, tenantId),
          eq(billingMaster.provider_id, providerId),
          eq(billingMaster.department_id, departmentId),
          eq(billingMaster.consultation_type_id, consultationTypeId),
          eq(billingMaster.is_active, true),
          excludeId ? sql`${billingMaster.id} <> ${excludeId}` : sql`true`,
        ),
      );

    return rows.some((row) =>
      rangesOverlap(
        row.effective_from,
        row.effective_to,
        effectiveFrom,
        effectiveTo,
      ),
    );
  }

  async upsertProviderConsultationTariff(tenantId: string, input: UpsertProviderConsultationTariffInput) {
    const [existingExact] = await this.db
      .select()
      .from(billingMaster)
      .where(
        and(
          eq(billingMaster.iq_tenant_id, tenantId),
          eq(billingMaster.provider_id, input.provider_id),
          eq(billingMaster.department_id, input.department_id),
          eq(billingMaster.consultation_type_id, input.consultation_type_id),
        ),
      )
      .limit(1);

    if (!existingExact) {
      const [existingDept] = await this.db
        .select()
        .from(billingMaster)
        .where(
          and(
            eq(billingMaster.iq_tenant_id, tenantId),
            eq(billingMaster.provider_id, input.provider_id),
            eq(billingMaster.department_id, input.department_id),
            eq(billingMaster.is_active, true),
          ),
        )
        .limit(1);
      if (existingDept) {
        throw Object.assign(
          new Error("provider_department_tariff_already_exists"),
          { code: "23505" },
        );
      }
    }

    const existing = existingExact;

    const basePrice = formatMoney(Number(input.base_price));
    const taxPct = formatMoney(Number(input.tax_percentage ?? 0));
    const now = new Date();

    if (existing) {
      const priceChanged =
        String(existing.base_price) !== basePrice ||
        String(existing.tax_percentage) !== taxPct;
      const [row] = await this.db
        .update(billingMaster)
        .set({
          service_code: input.service_code,
          service_name: input.service_name,
          department: input.department_label,
          category: "consultation",
          base_price: basePrice,
          tax_percentage: taxPct,
          is_active: true,
          ...(priceChanged ? { effective_from: now } : {}),
          updated_at: now,
        })
        .where(
          and(eq(billingMaster.iq_tenant_id, tenantId), eq(billingMaster.id, existing.id)),
        )
        .returning();
      return toTariffRow(row!);
    }

    const [row] = await this.db
      .insert(billingMaster)
      .values({
        iq_tenant_id: tenantId,
        service_code: input.service_code,
        service_name: input.service_name,
        provider_id: input.provider_id,
        department_id: input.department_id,
        consultation_type_id: input.consultation_type_id,
        department: input.department_label,
        category: "consultation",
        base_price: basePrice,
        tax_percentage: taxPct,
        is_active: true,
        effective_from: now,
        effective_to: null,
      })
      .returning();
    return toTariffRow(row!);
  }

  async bulkUpsertProviderConsultationTariffs(tenantId, input, buildRow) {
    return this.db.transaction(async (tx) => {
      const repo = new DrizzleTariffMasterRepository(tx as DbInstance);
      const results: TariffMasterRow[] = [];
      for (const item of input.items) {
        results.push(await repo.upsertProviderConsultationTariff(tenantId, buildRow(item)));
      }
      return results;
    });
  }

  async update(tenantId: string, id: string, patch: TariffMasterUpdatePatch) {
    const values = toDbUpdateValues(patch);
    if (Object.keys(values).length <= 1) return this.findById(tenantId, id);

    const [row] = await this.db
      .update(billingMaster)
      .set(values)
      .where(and(eq(billingMaster.iq_tenant_id, tenantId), eq(billingMaster.id, id)))
      .returning();

    return row ? toTariffRow(row) : undefined;
  }
}

function createInMemoryRepo(rows: TariffMasterRow[]): TariffMasterRepo {
  return {
    findById: async (tenantId, id) =>
      rows.find((r) => r.iq_tenant_id === tenantId && r.id === id),
    findByCodeAndProvider: async (tenantId, code, providerId) => {
      const at = new Date();
      return rows.find(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.service_code === code.trim() &&
          r.is_active &&
          sameProvider(r.provider_id, providerId) &&
          new Date(r.effective_from) <= at &&
          (r.effective_to === null || new Date(r.effective_to) > at),
      );
    },
    findActiveRegistrationFee: async (tenantId, excludeId) =>
      rows.find(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.is_active &&
          r.provider_id == null &&
          isRegistrationTariffCategory(r.category) &&
          r.id !== excludeId,
      ),
    findActiveProviderDepartmentTariff: async (tenantId, query) =>
      rows.find((r) => {
        if (r.iq_tenant_id !== tenantId || !r.is_active || r.provider_id !== query.provider_id) {
          return false;
        }
        if (query.excludeId && r.id === query.excludeId) return false;

        const departmentId = query.department_id?.trim() || null;
        const departmentLabel = query.department?.trim()
          ? normalizeDepartmentLabel(query.department)
          : null;

        if (departmentId) {
          if (r.department_id === departmentId) return true;
          if (
            r.department_id == null &&
            departmentLabel &&
            normalizeDepartmentLabel(r.department) === departmentLabel
          ) {
            return true;
          }
          return false;
        }

        if (departmentLabel) {
          return (
            r.department_id == null &&
            normalizeDepartmentLabel(r.department) === departmentLabel
          );
        }

        return false;
      }),
    resolveConsultationTariff: async (
      tenantId,
      providerId,
      departmentId,
      consultationTypeId,
      at = new Date(),
    ) =>
      rows.find(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.provider_id === providerId &&
          r.department_id === departmentId &&
          r.consultation_type_id === consultationTypeId &&
          r.is_active &&
          new Date(r.effective_from) <= at &&
          (r.effective_to === null || new Date(r.effective_to) > at),
      ),
    listProviderConsultationTariffs: async (tenantId, query) =>
      rows.filter(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.provider_id != null &&
          r.department_id != null &&
          r.consultation_type_id != null &&
          r.is_active &&
          (!query.provider_id || r.provider_id === query.provider_id) &&
          (!query.department_id || r.department_id === query.department_id) &&
          (!query.consultation_type_id ||
            r.consultation_type_id === query.consultation_type_id),
      ),
    hasOverlappingConsultationTariff: async (
      tenantId,
      providerId,
      departmentId,
      consultationTypeId,
      effectiveFrom,
      effectiveTo,
      excludeId,
    ) =>
      rows.some(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.provider_id === providerId &&
          r.department_id === departmentId &&
          r.consultation_type_id === consultationTypeId &&
          r.is_active &&
          r.id !== excludeId &&
          rangesOverlap(
            new Date(r.effective_from),
            r.effective_to ? new Date(r.effective_to) : null,
            effectiveFrom,
            effectiveTo,
          ),
      ),
    upsertProviderConsultationTariff: async (tenantId, input) => {
      const index = rows.findIndex(
        (r) =>
          r.iq_tenant_id === tenantId &&
          r.provider_id === input.provider_id &&
          r.department_id === input.department_id &&
          r.consultation_type_id === input.consultation_type_id,
      );

      if (index < 0) {
        const deptDuplicate = rows.find(
          (r) =>
            r.iq_tenant_id === tenantId &&
            r.is_active &&
            r.provider_id === input.provider_id &&
            r.department_id === input.department_id,
        );
        if (deptDuplicate) {
          throw Object.assign(
            new Error("provider_department_tariff_already_exists"),
            { code: "23505" },
          );
        }
      }

      const existingIndex = index;
      const now = new Date().toISOString();
      const basePrice = formatMoney(Number(input.base_price));
      const taxPct = formatMoney(Number(input.tax_percentage ?? 0));

      if (existingIndex >= 0) {
        const existing = rows[existingIndex]!;
        const priceChanged =
          existing.base_price !== basePrice || existing.tax_percentage !== taxPct;
        rows[existingIndex] = {
          ...existing,
          service_code: input.service_code,
          service_name: input.service_name,
          department: input.department_label,
          category: "consultation",
          base_price: basePrice,
          tax_percentage: taxPct,
          is_active: true,
          effective_from: priceChanged ? now : existing.effective_from,
          updated_at: now,
        };
        return rows[existingIndex]!;
      }

      const row: TariffMasterRow = {
        id: randomUUID(),
        iq_tenant_id: tenantId,
        service_code: input.service_code,
        service_name: input.service_name,
        description: null,
        provider_id: input.provider_id,
        department_id: input.department_id,
        consultation_type_id: input.consultation_type_id,
        department: input.department_label,
        category: "consultation",
        sub_category: null,
        tax_type: null,
        base_price: basePrice,
        tax_percentage: taxPct,
        is_active: true,
        effective_from: now,
        effective_to: null,
        created_at: now,
        updated_at: now,
        created_by: null,
        updated_by: null,
      };
      rows.push(row);
      return row;
    },
    bulkUpsertProviderConsultationTariffs: async (tenantId, input, buildRow) => {
      const inner = createInMemoryRepo(rows);
      const results: TariffMasterRow[] = [];
      for (const item of input.items) {
        results.push(await inner.upsertProviderConsultationTariff(tenantId, buildRow(item)));
      }
      return results;
    },
    update: async (tenantId, id, patch) => {
      const index = rows.findIndex((r) => r.iq_tenant_id === tenantId && r.id === id);
      if (index < 0) return undefined;
      rows[index] = applyTariffPatch(rows[index]!, patch);
      return rows[index];
    },
  };
}

/** DB adapter when migrated; in-memory when `rows` is passed (no migration required). */
export function createTariffMasterRepo(source: DbInstance | TariffMasterRow[]): TariffMasterRepo {
  return Array.isArray(source) ? createInMemoryRepo(source) : new DrizzleTariffMasterRepository(source);
}
