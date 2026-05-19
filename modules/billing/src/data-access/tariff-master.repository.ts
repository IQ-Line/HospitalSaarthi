import { and, eq, type DbInstance } from "@hims/ts-sdk-db";
import { billingMaster } from "../schema/tables.js";
import type { TariffMasterRepo, TariffMasterUpdatePatch } from "../ports.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import { applyTariffPatch, toDbUpdateValues, toTariffRow } from "../lib/tariff-api.js";

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
