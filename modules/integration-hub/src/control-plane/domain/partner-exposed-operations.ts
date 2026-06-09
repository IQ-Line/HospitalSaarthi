/**
 * Partner-exposed OpenAPI operationId registry (routing allowlist only — Cerbos remains authoritative).
 * Format: `{specFileStem}.{operationId}` per ADR-0032 amendment D.
 */
export const PARTNER_EXPOSED_OPERATIONS = [
  "registration.listRegistrations",
  "empi.getPatient",
  "configurator.listTenants",
  "configurator.listTenantModules",
  "masterData.listModules",
] as const;

export type PartnerExposedOperation = (typeof PARTNER_EXPOSED_OPERATIONS)[number];

export type PartnerOperationCatalogEntry = {
  id: PartnerExposedOperation;
  group: string;
  label: string;
  description: string;
  inbound_path: string;
};

export const PARTNER_OPERATION_CATALOG: readonly PartnerOperationCatalogEntry[] = [
  {
    id: "registration.listRegistrations",
    group: "Registration",
    label: "List registrations",
    description: "Read registration list for the tenant.",
    inbound_path: "/api/integration-hub/v1/inbound/registration.listRegistrations",
  },
  {
    id: "empi.getPatient",
    group: "EMPI",
    label: "Get patient",
    description: "Read a patient record by ID.",
    inbound_path: "/api/integration-hub/v1/inbound/empi.getPatient/:patientId",
  },
  {
    id: "configurator.listTenants",
    group: "Configurator",
    label: "List active tenants",
    description: "LC/NC — list tenants (e.g. provisioning_status=active).",
    inbound_path: "/api/integration-hub/v1/inbound/configurator.listTenants",
  },
  {
    id: "configurator.listTenantModules",
    group: "Configurator",
    label: "List tenant modules",
    description: "LC/NC — enabled modules for a tenant.",
    inbound_path: "/api/integration-hub/v1/inbound/configurator.listTenantModules/:tenantId",
  },
  {
    id: "masterData.listModules",
    group: "Master Data",
    label: "List module catalog",
    description: "Global module registry (no upstream auth).",
    inbound_path: "/api/integration-hub/v1/inbound/masterData.listModules",
  },
] as const;

export function listPartnerOperationCatalog(): readonly PartnerOperationCatalogEntry[] {
  return PARTNER_OPERATION_CATALOG;
}

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
