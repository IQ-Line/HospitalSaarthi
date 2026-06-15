import { describe, expect, it } from 'vitest';
import {
  activeVisitpadCatalogRows,
  findVisitpadMedicineByDisplayName,
  findVisitpadProcedureByDisplayName,
  formatMethodStrengthLabel,
  matchMethodStrengthOption,
  resolveMedicineStrengthDisplay,
  visitpadDiagnosisOptions,
  visitpadMedicineOptions,
  visitpadMethodStrengthOptions,
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

  it('formats and matches method strength rx column options', () => {
    const columns = [
      {
        is_active: true,
        is_deleted: false,
        display_name: '100',
        extra_unit: 'mg',
      },
      {
        is_active: true,
        is_deleted: false,
        display_name: '250',
        extra_unit: 'mg',
      },
    ] as never;

    expect(formatMethodStrengthLabel(columns[0])).toBe('100 mg');
    expect(visitpadMethodStrengthOptions(columns)).toEqual([
      { label: '100 mg', value: '100 mg' },
      { label: '250 mg', value: '250 mg' },
    ]);
    expect(matchMethodStrengthOption(columns, '100 mg')).toBe('100 mg');
    expect(matchMethodStrengthOption(columns, '500 mg')).toBe('');
    expect(matchMethodStrengthOption(columns, '100')).toBe('100 mg');
  });

  it('matches medicine strength to method_strength by numeric display_name only', () => {
    const columns = [
      {
        is_active: true,
        is_deleted: false,
        display_name: '350',
        extra_unit: 'mg',
      },
    ] as never;

    expect(matchMethodStrengthOption(columns, '350')).toBe('350 mg');
  });
});
