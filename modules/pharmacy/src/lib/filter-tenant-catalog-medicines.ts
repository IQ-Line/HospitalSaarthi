import type { MasterDataGatewayPort } from "../ports.js";
import type {
  DispenseLineItemRecord,
  OpdPrescriptionMedicineLine,
} from "../domain/pharmacy.types.js";

type CatalogMedicineRow = Record<string, unknown>;

function readMedicineId(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

export function extractPrescriptionMedicineId(row: Record<string, unknown>): string | null {
  return readMedicineId(row.medicine_id ?? row.medicineId);
}

function isActiveTenantCatalogMedicine(row: CatalogMedicineRow | null): row is CatalogMedicineRow {
  if (!row) return false;
  if (row.is_deleted === true) return false;
  if (row.is_active === false) return false;
  return true;
}

export function catalogMedicineDisplayName(row: CatalogMedicineRow): string {
  return String(row.display_name ?? "").trim();
}

export function catalogMedicineUnitPrice(row: CatalogMedicineRow): string | null {
  const price = row.price;
  if (price == null || price === "") return null;
  const num = Number(price);
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(4);
}

export async function resolveTenantCatalogMedicines(
  masterDataGateway: MasterDataGatewayPort,
  tenantId: string,
  medicineIds: readonly string[],
  bearerToken?: string,
): Promise<Map<string, CatalogMedicineRow>> {
  const uniqueIds = [...new Set(medicineIds.filter((id) => id.trim().length > 0))];
  const resolved = new Map<string, CatalogMedicineRow>();

  await Promise.all(
    uniqueIds.map(async (medicineId) => {
      const row = await masterDataGateway.getMedicineById(tenantId, medicineId, bearerToken);
      if (isActiveTenantCatalogMedicine(row)) {
        resolved.set(medicineId, row);
      }
    }),
  );

  return resolved;
}

export async function filterPrescriptionMedicinesForTenantCatalog(
  masterDataGateway: MasterDataGatewayPort,
  tenantId: string,
  medicines: OpdPrescriptionMedicineLine[],
  bearerToken?: string,
): Promise<OpdPrescriptionMedicineLine[]> {
  const ids = medicines
    .map((medicine) => medicine.medicine_id)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  if (ids.length === 0) {
    return [];
  }

  const catalogById = await resolveTenantCatalogMedicines(
    masterDataGateway,
    tenantId,
    ids,
    bearerToken,
  );

  return medicines.flatMap((medicine) => {
    const medicineId = medicine.medicine_id;
    if (!medicineId) return [];
    const catalog = catalogById.get(medicineId);
    if (!catalog) return [];

    const catalogName = catalogMedicineDisplayName(catalog);
    return [
      {
        ...medicine,
        medicine_id: medicineId,
        name: catalogName || medicine.name,
        catalog_unit_price: catalogMedicineUnitPrice(catalog),
      },
    ];
  });
}

type SaveDispenseLineLike = {
  medicine_id?: string | null;
  medicine_display_name: string;
};

export async function normalizeSaveDispenseLinesForCatalog<T extends SaveDispenseLineLike>(
  masterDataGateway: MasterDataGatewayPort,
  tenantId: string,
  lines: readonly T[],
  bearerToken: string | undefined,
  invalidLine: (index: number, message: string) => never,
): Promise<Array<T & { medicine_id: string; medicine_display_name: string }>> {
  const ids = lines
    .map((line) => readMedicineId(line.medicine_id))
    .filter((id): id is string => id != null);

  const catalogById = await resolveTenantCatalogMedicines(
    masterDataGateway,
    tenantId,
    ids,
    bearerToken,
  );

  return lines.map((line, index) => {
    const medicineId = readMedicineId(line.medicine_id);
    if (!medicineId) {
      invalidLine(index, "medicine_id is required — choose a medicine from the tenant catalog");
    }

    const catalog = catalogById.get(medicineId);
    if (!catalog) {
      invalidLine(index, "medicine_id must be a medicine from the tenant catalog");
    }

    const catalogName = catalogMedicineDisplayName(catalog);
    return {
      ...line,
      medicine_id: medicineId,
      medicine_display_name: catalogName || line.medicine_display_name.trim(),
    };
  });
}

export async function filterDispenseLineRecordsForTenantCatalog(
  masterDataGateway: MasterDataGatewayPort,
  tenantId: string,
  lines: DispenseLineItemRecord[],
  bearerToken?: string,
): Promise<DispenseLineItemRecord[]> {
  const ids = lines
    .map((line) => line.medicine_id)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  if (ids.length === 0) {
    return [];
  }

  const catalogById = await resolveTenantCatalogMedicines(
    masterDataGateway,
    tenantId,
    ids,
    bearerToken,
  );

  return lines.flatMap((line) => {
    const medicineId = line.medicine_id;
    if (!medicineId) return [];
    const catalog = catalogById.get(medicineId);
    if (!catalog) return [];

    const catalogName = catalogMedicineDisplayName(catalog);
    return [
      {
        ...line,
        medicine_id: medicineId,
        medicine_display_name: catalogName || line.medicine_display_name,
      },
    ];
  });
}
