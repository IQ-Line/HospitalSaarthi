import type { FastifyRequest } from "fastify";
import { InventoryError } from "../errors.js";

export const INVENTORY_INTERNAL_KEY_HEADER = "x-inventory-internal-key";

/**
 * Service-to-service guard for internal inventory routes.
 * When `INVENTORY_INTERNAL_API_KEY` is unset (local dev), the check is skipped.
 */
export function assertInventoryInternalAccess(request: FastifyRequest): void {
  const expected = process.env["INVENTORY_INTERNAL_API_KEY"]?.trim();
  if (!expected) {
    if (process.env["NODE_ENV"] === "production") {
      throw new InventoryError(
        "INVENTORY_INTERNAL_API_KEY is required in production for internal inventory routes",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }
    return;
  }

  const provided = request.headers[INVENTORY_INTERNAL_KEY_HEADER];
  if (typeof provided !== "string" || provided !== expected) {
    throw new InventoryError(
      "x-inventory-internal-key required for internal inventory route access",
      403,
      "FORBIDDEN",
    );
  }
}
