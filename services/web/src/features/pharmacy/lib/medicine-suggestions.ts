import type { VisitpadMedicine } from '@/features/visitpad/types';
import { activeVisitpadCatalogRows } from '@/features/create-rx/lib/visitpad-catalog-options';

export const PHARMACY_MEDICINE_SEARCH_MIN_CHARS = 2;

export const PHARMACY_MEDICINE_SUGGESTIONS_PAGE = {
  pageIndex: 0,
  pageSize: 15,
} as const;

/** Dropdown label — includes strength and short name when present. */
export function formatMedicineSuggestionLabel(medicine: VisitpadMedicine): string {
  const base = medicine.strength_display
    ? `${medicine.display_name} — ${medicine.strength_display}`
    : medicine.display_name;
  const short = medicine.short_name?.trim();
  return short ? `${base} (${short})` : base;
}

/** Value stored on dispense line inputs when a catalog row is picked. */
export function medicineDisplayNameFromCatalog(medicine: VisitpadMedicine): string {
  return medicine.display_name.trim();
}

export function activeMedicineSuggestions(items: VisitpadMedicine[] | undefined): VisitpadMedicine[] {
  return activeVisitpadCatalogRows(items);
}
