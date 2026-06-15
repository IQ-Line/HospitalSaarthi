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
  items: Array<{ display_name: string }> | undefined,
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
  return activeVisitpadCatalogRows(items).map((item) => ({
    label: item.strength_display
      ? `${item.display_name} — ${item.strength_display}`
      : item.display_name,
    value: item.display_name,
  }));
}

export function visitpadProcedureOptions(
  items: VisitpadProcedure[] | undefined,
): VisitpadSelectOption[] {
  return activeVisitpadCatalogRows(items).map((item) => ({
    label: item.cpt_code ? `${item.display_name} (${item.cpt_code})` : item.display_name,
    value: item.display_name,
  }));
}

export function findVisitpadMedicineByDisplayName(
  items: VisitpadMedicine[] | undefined,
  displayName: string,
): VisitpadMedicine | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return undefined;
  return activeVisitpadCatalogRows(items).find((item) => item.display_name === trimmed);
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
