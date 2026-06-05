/**
 * Partner-facing stable operation contracts (ADR-0032 amendment H).
 * CI enforces immutability against OpenAPI specs in specs/openapi/.
 */
export type PartnerExposedOperation = {
  /** Registry key: `{spec}.{operationId}` */
  ref: string;
  spec: "registration" | "empi";
  operationId: string;
};

export const PARTNER_EXPOSED_OPERATIONS: readonly PartnerExposedOperation[] = [
  {
    ref: "registration.listRegistrations",
    spec: "registration",
    operationId: "listRegistrations",
  },
  {
    ref: "empi.getPatient",
    spec: "empi",
    operationId: "getPatient",
  },
] as const;
