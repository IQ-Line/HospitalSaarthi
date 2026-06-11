import type { FastifyRequest } from "fastify";
import { PharmacyError } from "../errors.js";

export const PHARMACY_INTERNAL_KEY_HEADER = "x-pharmacy-internal-key";

/**
 * Service-to-service guard for internal projection routes.
 * Set `PHARMACY_INTERNAL_API_KEY` in production; when unset (local dev only),
 * the check is skipped so OPD push and curl work without the header.
 */
export function assertPharmacyInternalAccess(request: FastifyRequest): void {
  const expected = process.env["PHARMACY_INTERNAL_API_KEY"]?.trim();
  if (!expected) {
    if (process.env["NODE_ENV"] === "production") {
      throw new PharmacyError(
        503,
        "PHARMACY_INTERNAL_API_KEY is required in production for internal pharmacy routes",
        "SERVICE_UNAVAILABLE",
      );
    }
    return;
  }

  const provided = request.headers[PHARMACY_INTERNAL_KEY_HEADER];
  if (typeof provided !== "string" || provided !== expected) {
    throw new PharmacyError(
      403,
      "x-pharmacy-internal-key required for internal pharmacy route access",
      "FORBIDDEN",
    );
  }
}
