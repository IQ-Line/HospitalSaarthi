import { describe, expect, it } from 'vitest';
import {
  visitpadUnitConversionCreateSchema,
  visitpadUnitCreateSchema,
  visitpadMedicineCreateCoreSchema,
} from './validation';

describe('visitpadUnitCreateSchema', () => {
  it('accepts minimal valid unit', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: 'deg_c',
      display_label: '°C',
      dimension: 'temperature',
      ucum_code: null,
      is_canonical: false,
      display_order: 0,
      is_active: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty code', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: '',
      display_label: 'x',
      dimension: 'other',
    });
    expect(r.success).toBe(false);
  });
});

describe('visitpadUnitConversionCreateSchema', () => {
  it('rejects identical from/to', () => {
    const r = visitpadUnitConversionCreateSchema.safeParse({
      from_unit_code: 'kg',
      to_unit_code: 'kg',
      factor: 1,
    });
    expect(r.success).toBe(false);
  });

  it('accepts distinct from/to', () => {
    const r = visitpadUnitConversionCreateSchema.safeParse({
      from_unit_code: 'kg',
      to_unit_code: 'lb',
      factor: 2.2046226218,
      offset_value: 0,
    });
    expect(r.success).toBe(true);
  });
});

describe('visitpadMedicineCreateCoreSchema', () => {
  it('accepts required medicine fields', () => {
    const r = visitpadMedicineCreateCoreSchema.safeParse({
      code: 'para500',
      display_name: 'Paracetamol 500mg',
      generic_name: 'Paracetamol',
      drug_class: 'Analgesic',
      dosage_form: 'tablet',
      schedule: 'otc',
    });
    expect(r.success).toBe(true);
  });
});
