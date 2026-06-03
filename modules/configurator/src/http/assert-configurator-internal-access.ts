import type { FastifyRequest } from "fastify";
import { ConfiguratorError } from "../errors.js";

const INTERNAL_KEY_HEADER = "x-configurator-internal-key";

/**
 * Service-to-service guard for endpoints that return integration credentials.
 * Set `CONFIGURATOR_INTERNAL_API_KEY` in production; when unset (local dev only),
 * the check is skipped so `pnpm seed-abdm-profile` and curl work without the header.
 */
export function assertConfiguratorInternalAccess(request: FastifyRequest): void {
  const expected = process.env["CONFIGURATOR_INTERNAL_API_KEY"]?.trim();
  if (!expected) {
    if (process.env["NODE_ENV"] === "production") {
      throw new ConfiguratorError(
        503,
        "CONFIGURATOR_INTERNAL_API_KEY is required in production for internal integration profile routes",
        "SERVICE_UNAVAILABLE",
      );
    }
    return;
  }

  const provided = request.headers[INTERNAL_KEY_HEADER];
  if (typeof provided !== "string" || provided !== expected) {
    throw new ConfiguratorError(
      403,
      "x-configurator-internal-key required for internal integration profile access",
      "FORBIDDEN",
    );
  }
}
