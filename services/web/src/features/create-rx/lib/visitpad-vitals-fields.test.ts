import { describe, expect, it } from 'vitest';
import { vitalPairGroupLabel, visitpadVitalsToFieldDefs } from './visitpad-vitals-fields';
import type { VisitpadVital } from '@/features/visitpad/types';

function vital(partial: Partial<VisitpadVital> & Pick<VisitpadVital, 'code' | 'name'>): VisitpadVital {
  return {
    id: partial.id ?? '1',
    iq_tenant_id: null,
    short_name: partial.short_name ?? partial.code,
    category: partial.category ?? 'vital_signs',
    data_type: partial.data_type ?? 'numeric',
    unit: partial.unit ?? 'mmHg',
    default_unit_code: partial.default_unit_code ?? 'mmhg',
    display_order: partial.display_order ?? 0,
    is_active: partial.is_active ?? true,
    is_deleted: partial.is_deleted ?? false,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...partial,
  };
}

describe('visitpadVitalsToFieldDefs', () => {
  it('maps active vitals with display order, units, and pairing', () => {
    const fields = visitpadVitalsToFieldDefs([
      vital({
        code: 'diastolic_bp',
        name: 'Diastolic BP',
        unit: 'mmHg',
        default_unit_code: 'mmhg',
        display_order: 2,
        is_paired: true,
        pair_code: 'systolic_bp',
      }),
      vital({
        code: 'systolic_bp',
        name: 'Systolic BP',
        unit: 'mmHg',
        default_unit_code: 'mmhg',
        display_order: 1,
      }),
      vital({
        code: 'pulse_rate',
        name: 'Pulse Rate',
        unit: 'bpm',
        default_unit_code: 'bpm',
        display_order: 3,
      }),
      vital({ code: 'inactive', name: 'Inactive', is_active: false }),
    ]);

    expect(fields).toEqual([
      {
        code: 'systolic_bp',
        label: 'Systolic BP',
        unit: 'mmHg',
        defaultUnitCode: 'mmhg',
        pairedWith: undefined,
        normalRange: undefined,
        rangeLabel: undefined,
      },
      {
        code: 'diastolic_bp',
        label: 'Diastolic BP',
        unit: 'mmHg',
        defaultUnitCode: 'mmhg',
        pairedWith: 'systolic_bp',
        normalRange: undefined,
        rangeLabel: undefined,
      },
      {
        code: 'pulse_rate',
        label: 'Pulse Rate',
        unit: 'bpm',
        defaultUnitCode: 'bpm',
        pairedWith: undefined,
        normalRange: undefined,
        rangeLabel: undefined,
      },
    ]);
  });

  it('includes configured normal range labels', () => {
    const fields = visitpadVitalsToFieldDefs([
      vital({
        code: 'vc_02',
        name: 'Pulse Rate',
        normal_range_adult: { min: 90, max: 120 },
      }),
    ]);

    expect(fields[0]?.rangeLabel).toBe('90–120');
    expect(fields[0]?.normalRange).toEqual({ min: 90, max: 120 });
  });
});

describe('vitalPairGroupLabel', () => {
  it('uses Blood Pressure for systolic/diastolic pairs', () => {
    expect(
      vitalPairGroupLabel(
        { code: 'systolic_bp', label: 'Systolic BP' },
        { code: 'diastolic_bp', label: 'Diastolic BP', pairedWith: 'systolic_bp' },
      ),
    ).toBe('Blood Pressure');
  });
});
