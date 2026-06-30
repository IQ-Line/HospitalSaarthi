import type {
  VisitpadDiagnosis,
  VisitpadMedicine,
  VisitpadProcedure,
  VisitpadRxColumn,
} from '@/features/visitpad/types';
import { VISITPAD_MEDICINE_ADMIN_ROUTES } from '@/features/visitpad/openapi-constants';

export type VisitpadSelectOption = { label: string; value: string };

type ActiveCatalogRow = { is_active: boolean; is_deleted: boolean };

export function activeVisitpadCatalogRows<T extends ActiveCatalogRow>(items: T[] | undefined): T[] {
  return (items ?? []).filter((row) => row.is_active && !row.is_deleted);
}

export function visitpadDisplayNameOptions(
  items: Array<ActiveCatalogRow & { display_name: string }> | undefined,
): VisitpadSelectOption[] {
  return activeVisitpadCatalogRows(items).map((item) => ({
    label: item.display_name,
    value: item.display_name,
  }));
}

export function visitpadDiagnosisOptions(
  items: VisitpadDiagnosis[] | undefined,
): VisitpadSelectOption[] {
  return activeVisitpadCatalogRows(items).map((item) => ({
    label: item.icd10_code ? `${item.display_name} (${item.icd10_code})` : item.display_name,
    value: item.display_name,
  }));
}

export function visitpadMedicineOptions(
  items: VisitpadMedicine[] | undefined,
): VisitpadSelectOption[] {
  return activeVisitpadCatalogRows(items).map((item) => {
    const strength = resolveMedicineStrengthDisplay(item);
    return {
      label: strength ? `${item.display_name} — ${strength}` : item.display_name,
      value: item.display_name,
    };
  });
}

export function visitpadProcedureOptions(
  items: VisitpadProcedure[] | undefined,
): VisitpadSelectOption[] {
  return activeVisitpadCatalogRows(items).map((item) => ({
    label: item.cpt_code ? `${item.display_name} (${item.cpt_code})` : item.display_name,
    value: item.display_name,
  }));
}

export function findVisitpadProcedureByDisplayName(
  items: VisitpadProcedure[] | undefined,
  displayName: string,
): VisitpadProcedure | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return undefined;
  const rows = activeVisitpadCatalogRows(items);

  const exact = rows.find((item) => item.display_name === trimmed);
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  const caseInsensitive = rows.find((item) => item.display_name.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;

  return rows.find((item) => {
    const label = item.cpt_code ? `${item.display_name} (${item.cpt_code})` : item.display_name;
    return label === trimmed || label.toLowerCase() === lower;
  });
}

export function findVisitpadMedicineByDisplayName(
  items: VisitpadMedicine[] | undefined,
  displayName: string,
): VisitpadMedicine | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return undefined;
  const rows = activeVisitpadCatalogRows(items);

  const exact = rows.find((item) => item.display_name === trimmed);
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  const caseInsensitive = rows.find((item) => item.display_name.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;

  return rows.find((item) => {
    const strength = resolveMedicineStrengthDisplay(item);
    const label = strength ? `${item.display_name} — ${strength}` : item.display_name;
    return label === trimmed || label.toLowerCase() === lower;
  });
}

function coerceStrengthValue(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/** Prefer explicit display; fall back to value + unit when admin only filled formulation fields. */
export function resolveMedicineStrengthDisplay(
  medicine: Pick<VisitpadMedicine, 'strength_display' | 'strength_value' | 'strength_unit'>,
): string {
  const display = medicine.strength_display?.trim();
  if (display) return display;

  const unit = medicine.strength_unit?.trim();
  const value = coerceStrengthValue(medicine.strength_value);
  if (value != null && unit) {
    const formattedValue = String(value);
    return `${formattedValue} ${unit}`;
  }
  if (value != null) return String(value);
  if (unit) return unit;
  return '';
}

/** Rx column method_strength — strength value plus dose unit (e.g. `100 mg`). */
export function formatMethodStrengthLabel(
  column: Pick<VisitpadRxColumn, 'display_name' | 'extra_unit'>,
): string {
  const name = column.display_name?.trim() ?? '';
  const unit = column.extra_unit?.trim() ?? '';
  if (name && unit) return `${name} ${unit}`;
  return name;
}

export function visitpadMethodStrengthOptions(
  items: VisitpadRxColumn[] | undefined,
): VisitpadSelectOption[] {
  return activeVisitpadCatalogRows(items).map((item) => {
    const label = formatMethodStrengthLabel(item);
    return { label, value: label };
  });
}

/** Map medicine/catalog strength text to a method_strength picklist value when possible. */
export function matchMethodStrengthOption(
  items: VisitpadRxColumn[] | undefined,
  rawStrength: string | null | undefined,
): string {
  const trimmed = rawStrength?.trim() ?? '';
  if (!trimmed) return '';

  const rows = activeVisitpadCatalogRows(items);
  const formatted = (row: VisitpadRxColumn) => formatMethodStrengthLabel(row);

  const exact = rows.find((row) => formatted(row) === trimmed);
  if (exact) return formatted(exact);

  const lower = trimmed.toLowerCase();
  const caseInsensitive = rows.find((row) => formatted(row).toLowerCase() === lower);
  if (caseInsensitive) return formatted(caseInsensitive);

  const parsed = trimmed.match(/^([\d.]+)\s*(.*)$/);
  if (parsed) {
    const [, value, unitPart = ''] = parsed;
    const unit = unitPart.trim().toLowerCase();
    const match = rows.find((row) => {
      if (row.display_name.trim() !== value) return false;
      if (!unit) return true;
      const rowUnit = row.extra_unit?.trim().toLowerCase() ?? '';
      return !rowUnit || rowUnit === unit;
    });
    if (match) return formatted(match);
  }

  const byName = rows.find((row) => row.display_name.trim() === trimmed);
  if (byName) return formatted(byName);

  return '';
}

export function visitpadRxColumnOptions(
  items: VisitpadRxColumn[] | undefined,
  fallback?: readonly VisitpadSelectOption[],
): VisitpadSelectOption[] {
  const options = activeVisitpadCatalogRows(items).map((item) => ({
    label: item.display_name,
    value: item.display_name,
  }));
  return options.length > 0 ? options : [...(fallback ?? [])];
}

export function resolveRxColumnDisplayName(
  items: VisitpadRxColumn[] | undefined,
  codeOrName: string | null | undefined,
): string {
  const trimmed = (codeOrName ?? '').trim();
  if (!trimmed) return '';

  const rows = activeVisitpadCatalogRows(items);
  const byCode = rows.find((item) => item.code === trimmed);
  if (byCode) return byCode.display_name;

  const byName = rows.find((item) => item.display_name === trimmed);
  if (byName) return byName.display_name;

  return trimmed;
}

export function resolveRouteDisplayName(
  routeOptions: VisitpadRxColumn[] | undefined,
  codeOrName: string | null | undefined,
): string {
  const fromCatalog = resolveRxColumnDisplayName(routeOptions, codeOrName);
  if (fromCatalog) return fromCatalog;

  const trimmed = (codeOrName ?? '').trim();
  if (!trimmed) return '';

  const fromConstants = VISITPAD_MEDICINE_ADMIN_ROUTES.find((route) => route.value === trimmed);
  return fromConstants?.label ?? trimmed;
}
