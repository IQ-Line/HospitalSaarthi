import { describe, expect, it } from 'vitest';
import type { DispenseLineDraft } from '../types';
import {
  buildSaveDispenseLinesFromDraft,
  dispenseLineHasDraftContent,
  firstDispenseValidationMessage,
  validateDispenseDraft,
} from './validate-dispense-draft';

const validLine = (overrides: Partial<DispenseLineDraft> = {}): DispenseLineDraft => ({
  key: 'line-1',
  prescription_line_no: 1,
  prescribed_item_name: 'Paracetamol 500mg',
  medicine_id: '3f32fbb1-ae80-4505-b02f-dc5c207ec551',
  medicine_display_name: 'Paracetamol',
  item_code: '',
  available_qty: '',
  prescribed_quantity: '10',
  quantity_dispensed: '5',
  unit_amount: '100',
  line_discount: '0',
  tax_percent: '0',
  ...overrides,
});

describe('validateDispenseDraft', () => {
  it('accepts a valid dispense draft', () => {
    const result = validateDispenseDraft([validLine()], '0');
    expect(result.isValid).toBe(true);
    expect(result.lineErrors).toEqual({});
    expect(result.discountError).toBeUndefined();
  });

  it('requires at least one catalog medicine', () => {
    const result = validateDispenseDraft(
      [
        {
          key: 'empty',
          prescription_line_no: null,
          prescribed_item_name: '',
          medicine_id: null,
          medicine_display_name: '',
          item_code: '',
          available_qty: '',
          prescribed_quantity: '',
          quantity_dispensed: '1',
          unit_amount: '0',
          line_discount: '0',
          tax_percent: '0',
        },
      ],
      '0',
    );
    expect(result.isValid).toBe(false);
    expect(result.formError).toBe('Add at least one medicine item from the item master.');
  });

  it('flags free-text medicine without catalog selection', () => {
    const result = validateDispenseDraft(
      [
        validLine({
          medicine_id: null,
          medicine_display_name: 'Random medicine',
        }),
      ],
      '0',
    );
    expect(result.isValid).toBe(false);
    expect(result.lineErrors['line-1']?.medicine).toBe('Choose a medicine item from the item master.');
  });

  it('validates numeric fields and discount limits', () => {
    const result = validateDispenseDraft(
      [
        validLine({
          line_discount: '600',
        }),
      ],
      '1000',
    );
    expect(result.isValid).toBe(false);
    expect(result.lineErrors['line-1']?.line_discount).toBe(
      'Line discount cannot exceed line amount.',
    );
    expect(result.discountError).toBe('Bill discount cannot exceed subtotal.');
  });

  it('builds save payload from valid lines only', () => {
    const lines = [
      validLine(),
      {
        key: 'line-2',
        prescription_line_no: null,
        prescribed_item_name: '',
        medicine_id: null,
        medicine_display_name: '',
        item_code: '',
        available_qty: '',
        prescribed_quantity: '',
        quantity_dispensed: '1',
        unit_amount: '0',
        line_discount: '0',
        tax_percent: '0',
      },
    ];
    expect(buildSaveDispenseLinesFromDraft(lines)).toHaveLength(1);
    expect(validateDispenseDraft(lines, '0').isValid).toBe(true);
    expect(
      firstDispenseValidationMessage(
        validateDispenseDraft([validLine({ quantity_dispensed: '-1' })], '0'),
      ),
    ).toBe('Dispensed quantity must be a non-negative number.');
  });

  it('requires dispensed quantity greater than zero', () => {
    const result = validateDispenseDraft([validLine({ quantity_dispensed: '0' })], '0');
    expect(result.isValid).toBe(false);
    expect(result.lineErrors['line-1']?.quantity_dispensed).toBe(
      'Dispensed quantity must be greater than zero.',
    );
  });

  it('detects draft content on partially filled rows', () => {
    expect(
      dispenseLineHasDraftContent(
        validLine({
          medicine_id: null,
          medicine_display_name: '',
          quantity_dispensed: '2',
        }),
      ),
    ).toBe(true);
  });
});
