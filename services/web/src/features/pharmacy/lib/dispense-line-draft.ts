import type { DispenseLineDraft } from '../types';

export function createEmptyDispenseLineDraft(): DispenseLineDraft {
  return {
    key: `new-${Date.now()}`,
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
  };
}
