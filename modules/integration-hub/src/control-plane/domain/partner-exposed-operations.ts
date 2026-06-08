/**
 * Partner-exposed OpenAPI operationId registry (routing allowlist only — Cerbos remains authoritative).
 * Format: `{specFileStem}.{operationId}` per ADR-0032 amendment D.
 */
export const PARTNER_EXPOSED_OPERATIONS = [
  "registration.listRegistrations",
  "empi.getPatient",
] as const;

export type PartnerExposedOperation = (typeof PARTNER_EXPOSED_OPERATIONS)[number];

const OPERATION_SET = new Set<string>(PARTNER_EXPOSED_OPERATIONS);

export function isPartnerExposedOperation(value: string): value is PartnerExposedOperation {
  return OPERATION_SET.has(value);
}

export function assertAllowedOperationsSubset(operations: string[]): void {
  const unknown = operations.filter((op) => !OPERATION_SET.has(op));
  if (unknown.length > 0) {
    throw new InvalidAllowedOperationsError(unknown);
  }
}

export class InvalidAllowedOperationsError extends Error {
  readonly code = "integration_allowed_operations_invalid" as const;

  constructor(readonly unknownOperations: string[]) {
    super(`Unknown partner-exposed operations: ${unknownOperations.join(", ")}`);
    this.name = "InvalidAllowedOperationsError";
  }
}
