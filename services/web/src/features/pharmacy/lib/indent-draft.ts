import type { IndentDraftLine } from '../types/replenishment-ui.types';

let draftLineCounter = 0;

export function createEmptyIndentDraftLine(): IndentDraftLine {
  draftLineCounter += 1;
  return {
    key: `line-${draftLineCounter}`,
    item_id: '',
    item_name: '',
    item_code: '',
    available_qty: null,
    base_uom: '',
    requested_qty: '0',
    last_grn_date: null,
    line_remarks: '',
  };
}

export function countFilledIndentLines(lines: IndentDraftLine[]): number {
  return lines.filter((line) => line.item_id.trim().length > 0).length;
}

export function sumRequestedQty(lines: IndentDraftLine[]): number {
  return lines.reduce((sum, line) => {
    const qty = Number.parseFloat(line.requested_qty);
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    return sum + qty;
  }, 0);
}
