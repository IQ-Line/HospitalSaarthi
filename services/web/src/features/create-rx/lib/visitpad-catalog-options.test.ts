import { describe, expect, it } from 'vitest';
import {
  activeVisitpadCatalogRows,
  visitpadDiagnosisOptions,
  visitpadMedicineOptions,
} from './visitpad-catalog-options';

describe('visitpad-catalog-options', () => {
  it('filters inactive and deleted rows', () => {
    expect(
      activeVisitpadCatalogRows([
        { is_active: true, is_deleted: false, display_name: 'A' },
        { is_active: false, is_deleted: false, display_name: 'B' },
        { is_active: true, is_deleted: true, display_name: 'C' },
      ]),
    ).toHaveLength(1);
  });

  it('formats diagnosis and medicine labels', () => {
    expect(
      visitpadDiagnosisOptions([
        {
          is_active: true,
          is_deleted: false,
          display_name: 'Hypertension',
          icd10_code: 'I10',
        } as never,
      ]),
    ).toEqual([{ label: 'Hypertension (I10)', value: 'Hypertension' }]);

    expect(
      visitpadMedicineOptions([
        {
          is_active: true,
          is_deleted: false,
          display_name: 'Paracetamol',
          strength_display: '500 mg',
        } as never,
      ]),
    ).toEqual([{ label: 'Paracetamol — 500 mg', value: 'Paracetamol' }]);
  });
});
