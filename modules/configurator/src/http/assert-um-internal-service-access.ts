import type { FastifyRequest } from "fastify";
import { ConfiguratorError } from "../errors.js";

const UM_INTERNAL_KEY_HEADER = "x-um-internal-key";

/**
 * Service-to-service guard for User Management entitlement lookups.
 * Set `UM_INTERNAL_API_KEY` on configurator-svc (same value as user-management-svc).
 * When unset in non-production, the check is skipped for local dev.
 */
export function assertUmInternalServiceAccess(request: FastifyRequest): void {
  const expected = process.env["UM_INTERNAL_API_KEY"]?.trim();
  if (!expected) {
    if (process.env["NODE_ENV"] === "production") {
      throw new ConfiguratorError(
        503,
        "UM_INTERNAL_API_KEY is required in production for internal tenant entitlement routes",
        "SERVICE_UNAVAILABLE",
      );
    }
    return;
  }

  const provided = request.headers[UM_INTERNAL_KEY_HEADER];
  if (typeof provided !== "string" || provided !== expected) {
    throw new ConfiguratorError(
      403,
      "x-um-internal-key required for internal tenant entitlement access",
      "FORBIDDEN",
    );
  }
}
