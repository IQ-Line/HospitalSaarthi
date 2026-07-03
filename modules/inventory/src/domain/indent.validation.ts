import { InventoryValidationError } from "../errors.js";
import type { IndentFulfillmentRoute } from "./indent.types.js";

export type { IndentFulfillmentRoute };

/** Only the central store may raise procurement (PR) fulfillment indents. */
export function assertProcurementFulfillmentFromCentralStore(
  fulfillmentRoute: IndentFulfillmentRoute,
  fromStore: { is_central_store: boolean },
): void {
  if (fulfillmentRoute !== "procurement") return;

  if (!fromStore.is_central_store) {
    throw new InventoryValidationError(
      "Only the central (procurement) store can raise PR (procurement) indents.",
    );
  }
}

/** Stock-transfer fulfillment requires a destination store; PR does not. */
export function assertIndentToStore(
  fulfillmentRoute: IndentFulfillmentRoute,
  toStoreId: string | null | undefined,
): void {
  if (fulfillmentRoute === "procurement") return;

  if (!toStoreId?.trim()) {
    throw new InventoryValidationError(
      "To store is required when fulfillment is stock transfer.",
    );
  }
}

export function assertDistinctIndentStores(
  fulfillmentRoute: IndentFulfillmentRoute,
  fromStoreId: string,
  toStoreId: string | null | undefined,
): void {
  if (fulfillmentRoute === "procurement") return;
  if (toStoreId && toStoreId === fromStoreId) {
    throw new InventoryValidationError("From store and to store must be different.");
  }
}

export function validateIndentHeader(input: {
  fulfillment_route: IndentFulfillmentRoute;
  from_store: { id: string; is_central_store: boolean };
  to_store_id?: string | null;
}): void {
  assertProcurementFulfillmentFromCentralStore(input.fulfillment_route, input.from_store);
  assertIndentToStore(input.fulfillment_route, input.to_store_id);
  assertDistinctIndentStores(input.fulfillment_route, input.from_store.id, input.to_store_id);
}
