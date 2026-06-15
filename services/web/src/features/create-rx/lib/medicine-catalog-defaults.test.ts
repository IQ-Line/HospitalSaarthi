import { describe, expect, it } from 'vitest';
import { computeMedicineQuantity } from './medication-rx-options';
import { buildCatalogMedicineDefaults } from './medicine-catalog-defaults';

describe('computeMedicineQuantity', () => {
  it('multiplies MAN total by days', () => {
    expect(
      computeMedicineQuantity({
        dosageMorning: '1',
        dosageAfternoon: '0',
        dosageNight: '1',
        days: '5',
        frequency: 'Twice Daily',
      }),
    ).toBe('10');
  });

  it('uses frequency when MAN is empty', () => {
    expect(
      computeMedicineQuantity({
        dosageMorning: '1',
        dosageAfternoon: '',
        dosageNight: '',
        days: '3',
        frequency: 'Once Daily',
      }),
    ).toBe('3');
  });

  it('returns empty when inputs are insufficient', () => {
    expect(
      computeMedicineQuantity({
        dosageMorning: '',
        dosageAfternoon: '',
        dosageNight: '',
        days: '3',
        frequency: '',
      }),
    ).toBe('');
  });
});

describe('buildCatalogMedicineDefaults', () => {
  it('fills strength from value and unit and calculates quantity', () => {
    const patch = buildCatalogMedicineDefaults(
      {
        id: 'med-1',
        display_name: 'Paracetamol',
        dosage_form: 'tablet',
        route_of_admin: ['oral'],
        default_route: 'oral',
        strength_display: '',
        strength_value: 500,
        strength_unit: 'mg',
        default_dose_value: 1,
        default_frequency: 'tid',
        default_duration_days: 3,
        typical_quantity: null,
      } as never,
      [
        {
          is_active: true,
          is_deleted: false,
          display_name: '500',
          extra_unit: 'mg',
        } as never,
      ],
    );

    expect(patch.strength).toBe('500 mg');
    expect(patch.quantity).toBe('3');
  });

  it('falls back to typical quantity when dosage cannot be computed', () => {
    const patch = buildCatalogMedicineDefaults({
      id: 'med-2',
      display_name: 'Saline',
      dosage_form: 'injection',
      route_of_admin: ['iv'],
      strength_display: '100 ml',
      typical_quantity: 2,
    } as never);

    expect(patch.strength).toBe('100 ml');
    expect(patch.quantity).toBe('2');
  });

  it('autofills strength from medicine when no method_strength picklist match', () => {
    const patch = buildCatalogMedicineDefaults({
      id: 'med-3',
      display_name: 'Dolo-650',
      dosage_form: 'tablet',
      route_of_admin: ['oral'],
      strength_display: '',
      strength_value: 350,
      strength_unit: null,
    } as never);

    expect(patch.strength).toBe('350');
  });

  it('prefers method_strength picklist label over raw medicine strength', () => {
    const patch = buildCatalogMedicineDefaults(
      {
        id: 'med-4',
        display_name: 'Dolo-650',
        dosage_form: 'tablet',
        route_of_admin: ['oral'],
        strength_display: '',
        strength_value: 350,
        strength_unit: null,
      } as never,
      [
        {
          is_active: true,
          is_deleted: false,
          display_name: '350',
          extra_unit: 'mg',
        } as never,
      ],
    );

    expect(patch.strength).toBe('350 mg');
  });
});
