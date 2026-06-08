import type { VisitpadMedicine } from '@/features/visitpad/types';
import { activeVisitpadCatalogRows } from '@/features/create-rx/lib/visitpad-catalog-options';

export const PHARMACY_MEDICINE_SEARCH_MIN_CHARS = 2;

export const PHARMACY_MEDICINE_SUGGESTIONS_PAGE = {
  pageIndex: 0,
  pageSize: 15,
} as const;

/** Dropdown label — includes strength when present. */
export function formatMedicineSuggestionLabel(medicine: VisitpadMedicine): string {
  return medicine.strength_display
    ? `${medicine.display_name} — ${medicine.strength_display}`
    : medicine.display_name;
}

/** Value stored on dispense lines when a catalog row is picked. */
export function medicineDisplayNameFromCatalog(medicine: VisitpadMedicine): string {
  const name = medicine.display_name.trim();
  const strength = medicine.strength_display.trim();
  if (!strength) return name;
  return `${name} ${strength}`;
}

export function activeMedicineSuggestions(items: VisitpadMedicine[] | undefined): VisitpadMedicine[] {
  return activeVisitpadCatalogRows(items);
}
