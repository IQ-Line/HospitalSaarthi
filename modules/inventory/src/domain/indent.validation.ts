import type {
  IndentFulfillmentRoute,
  IndentLineInput,
  SaveIndentDraftInput,
} from "./indent.types.js";

export function assertDistinctStores(fromStoreId: string, toStoreId: string): void {
  if (fromStoreId && toStoreId && fromStoreId === toStoreId) {
    throw new Error("From and to stores must differ");
  }
}

export function assertProcurementReference(
  route: IndentFulfillmentRoute,
  purchaseIndentNumber: string | null | undefined,
): void {
  if (route === "procurement") {
    const ref = purchaseIndentNumber?.trim() ?? "";
    if (!ref) {
      throw new Error("Purchase indent number is required for procurement");
    }
  }
}

export function assertIndentLines(lines: IndentLineInput[]): IndentLineInput[] {
  const valid: IndentLineInput[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (!line.item_id?.trim()) continue;
    if (seen.has(line.item_id)) {
      throw new Error("Duplicate item on indent");
    }
    seen.add(line.item_id);
    if (!Number.isFinite(line.requested_qty) || line.requested_qty <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    valid.push(line);
  }

  if (valid.length === 0) {
    throw new Error("Add at least one item with quantity greater than 0");
  }

  return valid;
}

export function validateSaveIndentDraft(input: SaveIndentDraftInput): SaveIndentDraftInput {
  if (!input.from_store_id?.trim()) {
    throw new Error(
      input.fulfillment_route === "procurement" ? "Select a receiving store" : "Select a from store",
    );
  }

  if (input.fulfillment_route === "procurement") {
    assertProcurementReference(input.fulfillment_route, input.purchase_indent_number);
    const lines = assertIndentLines(input.lines);
    return { ...input, to_store_id: null, lines };
  }

  if (!input.to_store_id?.trim()) {
    throw new Error("Select a to store");
  }
  assertDistinctStores(input.from_store_id, input.to_store_id);
  assertProcurementReference(input.fulfillment_route, input.purchase_indent_number);
  const lines = assertIndentLines(input.lines);
  return { ...input, lines };
}
