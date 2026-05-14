import { describe, expect, it } from 'vitest';
import {
  visitpadUnitConversionCreateSchema,
  visitpadUnitCreateSchema,
  visitpadMedicineCreateFormSchema,
} from './validation';

describe('visitpadUnitCreateSchema', () => {
  it('accepts minimal valid unit', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: 'deg_c',
      display_name: '°C',
      dimension: 'temperature',
      ucum_code: null,
      is_canonical: false,
      display_order: 0,
      is_active: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe('deg_c');
    }
  });

  it('normalizes unit code to lowercase', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: '  LB  ',
      display_name: 'Pound',
      dimension: 'mass',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe('lb');
    }
  });

  it('rejects empty code', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: '',
      display_name: 'x',
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

  it('rejects from/to that only differ by case', () => {
    const r = visitpadUnitConversionCreateSchema.safeParse({
      from_unit_code: 'kg',
      to_unit_code: 'KG',
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

describe('visitpadMedicineCreateFormSchema', () => {
  it('accepts a valid medicine form', () => {
    const r = visitpadMedicineCreateFormSchema.safeParse({
      code: 'para500',
      generic_name: 'Paracetamol',
      display_name: 'Paracetamol 500mg',
      drug_class: 'Analgesic',
      dosage_form: 'tablet',
      schedule: 'otc',
      display_order: 0,
      requires_prescription: false,
      is_controlled_substance: false,
      is_narcotic: false,
      is_restricted_antibiotic: false,
      pregnancy_category: 'not_set',
      lactation_safety: 'not_set',
      pediatric_use: 'not_set',
      black_box_warning: false,
      is_active: true,
    });
    expect(r.success).toBe(true);
  });
});
