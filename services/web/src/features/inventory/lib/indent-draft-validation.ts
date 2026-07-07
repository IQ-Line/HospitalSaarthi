import type { InventoryIndentRoute } from '../types';

export type IndentDraftLineInput = {
  item_id: string;
  requested_qty: string;
  line_remarks?: string;
};

export type IndentDraftValidationInput = {
  from_store_id: string;
  to_store_id: string;
  fulfillment_route: InventoryIndentRoute;
  purchase_indent_number?: string;
  lines: IndentDraftLineInput[];
};

export type IndentDraftLineErrors = {
  item_id?: string;
  requested_qty?: string;
};

export type IndentDraftValidationResult = {
  headerErrors: Record<string, string>;
  lineErrors: IndentDraftLineErrors[];
  isValid: boolean;
};

export function validateIndentDraft(input: IndentDraftValidationInput): IndentDraftValidationResult {
  const headerErrors: Record<string, string> = {};
  const lineErrors: IndentDraftLineErrors[] = input.lines.map(() => ({}));
  const isProcurement = input.fulfillment_route === 'procurement';

  if (!input.from_store_id) {
    headerErrors.from_store_id = isProcurement ? 'Select a receiving store' : 'Select a from store';
  }

  if (!isProcurement) {
    if (!input.to_store_id) {
      headerErrors.to_store_id = 'Select a to store';
    }
    if (input.from_store_id && input.to_store_id && input.from_store_id === input.to_store_id) {
      headerErrors.to_store_id = 'From and to stores must differ';
    }
  }

  if (isProcurement) {
    const ref = (input.purchase_indent_number ?? '').trim();
    if (!ref) {
      headerErrors.purchase_indent_number = 'Purchase indent number is required for procurement';
    }
  }

  const seenItems = new Set<string>();
  let hasValidLine = false;

  input.lines.forEach((line, index) => {
    const err: IndentDraftLineErrors = {};
    if (!line.item_id) {
      err.item_id = 'Select an item';
    } else {
      if (seenItems.has(line.item_id)) {
        err.item_id = 'Duplicate item';
      } else {
        seenItems.add(line.item_id);
      }
    }

    const qty = Number(line.requested_qty);
    if (!line.requested_qty.trim() || !Number.isFinite(qty) || qty <= 0) {
      err.requested_qty = 'Quantity must be greater than 0';
    } else if (line.item_id) {
      hasValidLine = true;
    }

    lineErrors[index] = err;
  });

  if (!hasValidLine) {
    headerErrors.lines = 'Add at least one item with quantity greater than 0';
  }

  const linesValid = lineErrors.every((e) => Object.keys(e).length === 0);
  const headerValid = Object.keys(headerErrors).length === 0;

  return {
    headerErrors,
    lineErrors,
    isValid: headerValid && linesValid,
  };
}
