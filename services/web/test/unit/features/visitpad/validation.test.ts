import { describe, expect, it } from 'vitest';
import {
  visitpadUnitConversionCreateSchema,
  visitpadUnitCreateSchema,
  visitpadMedicineCreateFormSchema,
  visitpadProcedureCreateFormSchema,
  visitpadAllergenCreateFormSchema,
  visitpadRxColumnCreateFormSchema,
  visitpadVitalCreateSchema,
} from '../../../../src/features/visitpad/validation';

describe('visitpadUnitCreateSchema', () => {
  it('accepts minimal valid unit', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: 'deg_c',
      display_name: '°C',
      dimension: 'temperature',
      ucum_code: null,
      is_canonical: false,
      display_order: 1,
      is_active: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe('deg_c');
      expect(r.data.display_order).toBe(1);
    }
  });

  it('normalizes unit code to lowercase', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: '  LBS  ',
      display_name: 'Pound',
      display_order: 2,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe('lbs');
      expect(r.data.dimension).toBe('other');
    }
  });

  it('rejects code shorter than 3 characters', () => {
    const r = visitpadUnitCreateSchema.safeParse({
      code: 'lb',
      display_name: 'x',
      display_order: 1,
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
  it('accepts minimal required medicine fields', () => {
    const r = visitpadMedicineCreateFormSchema.safeParse({
      code: 'para500',
      display_name: 'Paracetamol 500mg',
      display_order: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.schedule).toBeUndefined();
      expect(r.data.generic_name).toBeUndefined();
    }
  });

  it('accepts a fully populated medicine form', () => {
    const r = visitpadMedicineCreateFormSchema.safeParse({
      code: 'para500',
      generic_name: 'Paracetamol',
      display_name: 'Paracetamol 500mg',
      drug_class: 'Analgesic',
      dosage_form: 'tablet',
      schedule: 'otc',
      display_order: 0,
      price: '99.5',
      black_box_warning: true,
      black_box_warning_text: 'Risk text',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.price).toBe(99.5);
    }
  });

  it('rejects negative price', () => {
    const r = visitpadMedicineCreateFormSchema.safeParse({
      code: 'para500',
      display_name: 'Paracetamol 500mg',
      display_order: 0,
      price: '-1',
    });
    expect(r.success).toBe(false);
  });
});

describe('visitpadProcedureCreateFormSchema', () => {
  it('accepts create without duration (defaults to 0)', () => {
    const r = visitpadProcedureCreateFormSchema.safeParse({
      cpt_code: 'ecg_12',
      display_name: 'ECG',
      display_order: 1,
      duration_minutes: undefined,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.duration_minutes).toBe(0);
    }
  });

  it('treats NaN duration as omitted', () => {
    const r = visitpadProcedureCreateFormSchema.safeParse({
      cpt_code: 'ecg_12',
      display_name: 'ECG',
      display_order: 1,
      duration_minutes: Number.NaN,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.duration_minutes).toBe(0);
    }
  });
});

describe('visitpadRxColumnCreateFormSchema', () => {
  it('accepts 2-character rx column code', () => {
    const r = visitpadRxColumnCreateFormSchema.safeParse({
      display_name: 'Once daily',
      code: 'od',
      display_order: 1,
    });
    expect(r.success).toBe(true);
  });

  it('rejects 1-character rx column code', () => {
    const r = visitpadRxColumnCreateFormSchema.safeParse({
      display_name: 'x',
      code: 'o',
      display_order: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe('visitpadVitalCreateSchema', () => {
  it('accepts long vital slug codes', () => {
    const r = visitpadVitalCreateSchema.safeParse({
      code: 'respiratory_rate',
      display_order: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe('respiratory_rate');
    }
  });
});

describe('visitpadAllergenCreateFormSchema', () => {
  it('maps unset severity to unknown on output', () => {
    const r = visitpadAllergenCreateFormSchema.safeParse({
      code: 'pen_all',
      display_name: 'Penicillin',
      allergen_type: '__none__',
      reaction_severity_default: '__unset__',
      display_order: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.reaction_severity_default).toBe('unknown');
      expect(r.data.allergen_type).toBe('other');
    }
  });
});
