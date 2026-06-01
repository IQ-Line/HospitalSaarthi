import type { billingMaster } from "../schema/tables.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import type { TariffMasterUpdatePatch } from "../ports.js";

export function formatMoney(n: number): string {
  return n.toFixed(4);
}

export function toTariffRow(row: typeof billingMaster.$inferSelect): TariffMasterRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    service_code: row.service_code,
    service_name: row.service_name,
    description: row.description,
    provider_id: row.provider_id,
    department_id: row.department_id,
    category: row.category,
    sub_category: row.sub_category,
    tax_type: row.tax_type,
    base_price: String(row.base_price),
    tax_percentage: String(row.tax_percentage),
    is_active: row.is_active,
    effective_from: row.effective_from.toISOString(),
    effective_to: row.effective_to?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    created_by: row.created_by,
    updated_by: row.updated_by,
  };
}

export function parseDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : d;
}

export function validateMoney(
  value: string | number | undefined,
  field: string,
  min: number,
  max?: number,
): string | null {
  if (value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return `${field} must be >= ${min}`;
  if (max !== undefined && n > max) return `${field} must be <= ${max}`;
  return null;
}

export function validateEffectiveRange(from: Date, to: Date | null): string | null {
  return to !== null && to <= from ? "effective_to must be after effective_from" : null;
}

export function parseEffectiveWindow(
  from?: string,
  to?: string | null,
): { from: Date; to: Date | null } | string {
  const effectiveFrom = from ? parseDate(from) : new Date();
  if (from && !effectiveFrom) return "effective_from is invalid";
  let effectiveTo: Date | null = null;
  if (to) {
    effectiveTo = parseDate(to);
    if (!effectiveTo) return "effective_to is invalid";
  }
  return validateEffectiveRange(effectiveFrom!, effectiveTo) ?? { from: effectiveFrom!, to: effectiveTo };
}

export function hasPriceChange(patch: { base_price?: unknown; tax_percentage?: unknown }): boolean {
  return patch.base_price !== undefined || patch.tax_percentage !== undefined;
}

function toDbValue(key: keyof TariffMasterUpdatePatch, v: unknown): unknown {
  if (v === undefined) return undefined;
  switch (key) {
    case "service_name":
      return (v as string).trim();
    case "base_price":
    case "tax_percentage":
      return formatMoney(Number(v));
    case "effective_from":
    case "effective_to":
      if (v === null) return null;
      return v instanceof Date ? v : new Date(v as string);
    default:
      return v;
  }
}

function toRowValue(key: keyof TariffMasterUpdatePatch, v: unknown): unknown {
  if (key === "service_name") return (v as string).trim();
  if (key === "base_price" || key === "tax_percentage") return formatMoney(Number(v));
  if (key === "effective_from" || key === "effective_to") {
    return v === null ? null : toIso(v as Date | string);
  }
  return v;
}

export function applyTariffPatch(row: TariffMasterRow, patch: TariffMasterUpdatePatch): TariffMasterRow {
  const next = { ...row, updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(patch) as [keyof TariffMasterUpdatePatch, unknown][]) {
    if (value === undefined) continue;
    (next as Record<string, unknown>)[key] = toRowValue(key, value);
  }
  return next;
}

export function toDbUpdateValues(patch: TariffMasterUpdatePatch): Record<string, unknown> {
  const values: Record<string, unknown> = { updated_at: new Date() };
  for (const [key, value] of Object.entries(patch) as [keyof TariffMasterUpdatePatch, unknown][]) {
    if (value === undefined) continue;
    values[key] = toDbValue(key, value);
  }
  return values;
}
