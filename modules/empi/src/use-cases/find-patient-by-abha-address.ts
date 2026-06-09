import type { IdentifierRepo } from "../ports.js";

interface Deps {
  identifierRepo: IdentifierRepo;
}

export interface FindPatientByAbhaAddressResult {
  patientId: string;
}

export async function findPatientByAbhaAddress(
  deps: Deps,
  tenantId: string,
  abhaAddress: string,
): Promise<FindPatientByAbhaAddressResult | undefined> {
  const patientId = await deps.identifierRepo.findActivePatientIdByIdentifier(
    tenantId,
    "abha_address",
    abhaAddress,
  );

  if (!patientId) return undefined;

  return { patientId };
}
