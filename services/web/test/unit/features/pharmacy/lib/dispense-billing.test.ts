import { describe, expect, it } from 'vitest';
import {
  computeDispenseTotals,
  computeLineBilling,
  draftLinesFromPrescription,
  draftLinesFromSaved,
  formatDispenseDecimalInput,
  lineTotal,
} from '../../../../../src/features/pharmacy/lib/dispense-billing';

describe('dispense-billing', () => {
  it('computes line total and bill totals with discount', () => {
    expect(lineTotal('9', '2.5')).toBe('22.5000');
    expect(
      computeDispenseTotals(
        [
          {
            key: '1',
            medicine_id: null,
            medicine_display_name: 'Paracetamol',
            prescribed_quantity: '9',
            quantity_dispensed: '9',
            unit_amount: '2.5',
            line_discount: '0',
            tax_percent: '0',
          },
        ],
        '2',
      ),
    ).toEqual({
      subtotal: '22.5000',
      discount: '2.0000',
      total_amount: '20.5000',
    });
  });

  it('applies line discount and tax percent on each line', () => {
    expect(
      computeLineBilling({
        quantity_dispensed: '10',
        unit_amount: '10',
        line_discount: '20',
        tax_percent: '12',
      }),
    ).toEqual({
      line_total: '89.6000',
      tax_amount: '9.6000',
    });

    expect(
      computeDispenseTotals(
        [
          {
            key: '1',
            medicine_id: null,
            medicine_display_name: 'Tab B',
            prescribed_quantity: '',
            quantity_dispensed: '10',
            unit_amount: '10',
            line_discount: '20',
            tax_percent: '12',
          },
        ],
        '0',
      ),
    ).toEqual({
      subtotal: '89.6000',
      discount: '0.0000',
      total_amount: '89.6000',
    });
  });

  it('builds draft lines from prescription medicines', () => {
    const drafts = draftLinesFromPrescription([
      {
        line_no: 1,
        medicine_id: 'med-1',
        name: 'Paracetamol',
        strength: '500mg',
        dosage: '1 tab',
        duration: '3',
        frequency: 'TDS',
        quantity: '9',
        route: 'oral',
        catalog_unit_price: '12.5000',
      },
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.medicine_id).toBe('med-1');
    expect(drafts[0]?.medicine_display_name).toBe('Paracetamol');
    expect(drafts[0]?.quantity_dispensed).toBe('9');
    expect(drafts[0]?.unit_amount).toBe('12.5');
    expect(drafts[0]?.line_discount).toBe('0');
    expect(drafts[0]?.tax_percent).toBe('0');
  });

  it('formats persisted decimals without trailing zeros', () => {
    expect(formatDispenseDecimalInput('1.0000')).toBe('1');
    expect(formatDispenseDecimalInput('21.0000')).toBe('21');
    expect(formatDispenseDecimalInput('10.5000')).toBe('10.5');
    expect(formatDispenseDecimalInput('2.5678')).toBe('2.5678');

    const drafts = draftLinesFromSaved([
      {
        medicine_id: 'med-1',
        medicine_display_name: 'Tab A',
        prescribed_quantity: '21.0000',
        quantity_dispensed: '1.0000',
        unit_amount: '10.0000',
        line_discount: '2.0000',
        tax_percent: '12.0000',
      },
    ]);
    expect(drafts[0]).toMatchObject({
      prescribed_quantity: '21',
      quantity_dispensed: '1',
      unit_amount: '10',
      line_discount: '2',
      tax_percent: '12',
    });
  });
});
