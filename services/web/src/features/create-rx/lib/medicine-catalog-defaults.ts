import type { VisitpadMedicine, VisitpadRxColumn } from '@/features/visitpad/types';
import type { MedicineRow } from '../types';
import {
  computeMedicineQuantity,
  resolveMedicationDosageFormLabel,
  resolveMedicationFrequencyLabel,
  resolveMedicationRouteLabel,
  resolveMedicationToaLabel,
} from './medication-rx-options';
import {
  matchMethodStrengthOption,
  resolveMedicineStrengthDisplay,
} from './visitpad-catalog-options';

/** Apply visitpad medicine catalog defaults onto a prescription row. */
export function buildCatalogMedicineDefaults(
  catalog: VisitpadMedicine,
  methodStrengthColumns?: VisitpadRxColumn[],
): Partial<MedicineRow> {
  const rawStrength = resolveMedicineStrengthDisplay(catalog);
  const matchedStrength = matchMethodStrengthOption(methodStrengthColumns, rawStrength);

  const patch: Partial<MedicineRow> = {
    medicineId: catalog.id,
    dosageForm: resolveMedicationDosageFormLabel(catalog.dosage_form),
    route: resolveMedicationRouteLabel(
      catalog.default_route ?? catalog.route_of_admin[0] ?? '',
    ),
    strength: matchedStrength || rawStrength,
  };

  if (catalog.default_dose_value != null) {
    patch.dosageMorning = String(catalog.default_dose_value);
  }
  if (catalog.default_frequency) {
    patch.frequency = resolveMedicationFrequencyLabel(catalog.default_frequency);
  }
  if (catalog.default_instructions) {
    patch.toa = resolveMedicationToaLabel(catalog.default_instructions);
  }
  if (catalog.default_duration_days != null) {
    patch.days = String(catalog.default_duration_days);
  }

  const computedQuantity = computeMedicineQuantity({
    dosageMorning: patch.dosageMorning ?? '',
    dosageAfternoon: patch.dosageAfternoon ?? '',
    dosageNight: patch.dosageNight ?? '',
    days: patch.days ?? '',
    frequency: patch.frequency ?? '',
  });
  if (computedQuantity) {
    patch.quantity = computedQuantity;
  } else if (catalog.typical_quantity != null) {
    patch.quantity = String(catalog.typical_quantity);
  }

  return patch;
}

export function resolveMedicineQuantityFromRow(row: MedicineRow): string {
  return computeMedicineQuantity({
    dosageMorning: row.dosageMorning,
    dosageAfternoon: row.dosageAfternoon,
    dosageNight: row.dosageNight,
    days: row.days,
    frequency: row.frequency,
  });
}

const QUANTITY_RECALC_FIELDS = new Set<keyof MedicineRow>([
  'dosageMorning',
  'dosageAfternoon',
  'dosageNight',
  'days',
  'frequency',
]);

export function shouldRecalculateMedicineQuantity(field: keyof MedicineRow): boolean {
  return QUANTITY_RECALC_FIELDS.has(field);
}
