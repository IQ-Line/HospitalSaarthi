import { activeVisitpadCatalogRows } from './visitpad-catalog-options';
import type { VitalFieldDef } from '../types';
import type { VisitpadVital } from '@/features/visitpad/types';

/** Build Create RX vitals grid fields from active Visitpad master vitals. */
export function visitpadVitalsToFieldDefs(vitals: VisitpadVital[] | undefined): VitalFieldDef[] {
  return activeVisitpadCatalogRows(vitals)
    .sort((a, b) => a.display_order - b.display_order)
    .map((vital) => ({
      code: vital.code,
      label: vital.name,
      unit: vital.unit?.trim() || undefined,
      defaultUnitCode: vital.default_unit_code?.trim() || undefined,
      pairedWith:
        vital.is_paired && vital.pair_code?.trim() ? vital.pair_code.trim() : undefined,
    }));
}

/** Group heading for paired vitals (e.g. systolic + diastolic → Blood Pressure). */
export function vitalPairGroupLabel(primary: VitalFieldDef, secondary: VitalFieldDef): string {
  const combined = `${primary.label} ${secondary.label}`.toLowerCase();
  if (combined.includes('systolic') && combined.includes('diastolic')) return 'Blood Pressure';
  if (combined.includes('bp')) return 'Blood Pressure';
  return primary.label;
}
