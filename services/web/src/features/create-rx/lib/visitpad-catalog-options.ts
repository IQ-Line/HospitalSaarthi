import type { VisitpadDiagnosis, VisitpadMedicine } from '@/features/visitpad/types';

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

export function findVisitpadMedicineByDisplayName(
  items: VisitpadMedicine[] | undefined,
  displayName: string,
): VisitpadMedicine | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return undefined;
  return activeVisitpadCatalogRows(items).find((item) => item.display_name === trimmed);
}
