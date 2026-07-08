import { CORRELATION_HEADER } from "./correlation.js";

/**
 * Build the header(s) to propagate a correlation id on an OUTBOUND
 * service-to-service call. Returns an empty object when no id is available, so
 * it spreads cleanly into an existing header map:
 *
 * ```ts
 * const res = await fetch(url, {
 *   headers: { ...this.tenantHeaders(tenantId, bearerToken), ...correlationHeaders(correlationId) },
 * });
 * ```
 *
 * Convention: cross-module HTTP adapters take an optional `correlationId`
 * (read from `request.correlationId` at the call site) and spread this onto
 * every outbound `fetch`. The receiving service's `correlationIdPlugin` reads
 * it back off `x-correlation-id`, so one id threads through the whole call chain.
 */
export function correlationHeaders(correlationId: string | undefined): Record<string, string> {
  return correlationId ? { [CORRELATION_HEADER]: correlationId } : {};
}
