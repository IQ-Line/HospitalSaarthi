import { describe, expect, it } from 'vitest';
import {
  activeVisitpadCatalogRows,
  findVisitpadMedicineByDisplayName,
  findVisitpadProcedureByDisplayName,
  resolveMedicineStrengthDisplay,
  visitpadDiagnosisOptions,
  visitpadMedicineOptions,
  visitpadProcedureOptions,
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

    expect(
      visitpadProcedureOptions([
        {
          is_active: true,
          is_deleted: false,
          display_name: 'Appendectomy',
          cpt_code: '44950',
        } as never,
      ]),
    ).toEqual([{ label: 'Appendectomy (44950)', value: 'Appendectomy' }]);
  });

  it('resolves strength from value and unit when display is empty', () => {
    expect(
      resolveMedicineStrengthDisplay({
        strength_display: '',
        strength_value: 500,
        strength_unit: 'mg',
      } as never),
    ).toBe('500 mg');

    expect(
      visitpadMedicineOptions([
        {
          is_active: true,
          is_deleted: false,
          display_name: 'Paracetamol',
          strength_display: '',
          strength_value: 500,
          strength_unit: 'mg',
        } as never,
      ]),
    ).toEqual([{ label: 'Paracetamol — 500 mg', value: 'Paracetamol' }]);
  });

  it('finds medicine by case-insensitive name and dropdown label', () => {
    const rows = [
      {
        is_active: true,
        is_deleted: false,
        display_name: 'Calpol',
        strength_display: '',
        strength_value: 500,
        strength_unit: 'mg',
      },
    ] as never;

    expect(findVisitpadMedicineByDisplayName(rows, 'calpol')?.display_name).toBe('Calpol');
    expect(findVisitpadMedicineByDisplayName(rows, 'Calpol — 500 mg')?.display_name).toBe('Calpol');
  });

  it('formats procedure labels and resolves catalog matches', () => {
    const rows = [
      {
        is_active: true,
        is_deleted: false,
        display_name: 'Appendectomy',
        cpt_code: '44950',
      },
    ] as never;

    expect(visitpadProcedureOptions(rows)).toEqual([
      { label: 'Appendectomy (44950)', value: 'Appendectomy' },
    ]);
    expect(findVisitpadProcedureByDisplayName(rows, 'appendectomy')?.display_name).toBe(
      'Appendectomy',
    );
    expect(findVisitpadProcedureByDisplayName(rows, 'Appendectomy (44950)')?.display_name).toBe(
      'Appendectomy',
    );
  });
});
