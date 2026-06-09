import type { IdentifierRepo } from "../ports.js";

interface Deps {
  identifierRepo: IdentifierRepo;
}

export async function findPatientByAbhaAddress(
  deps: Deps,
  tenantId: string,
  abhaAddress: string,
): Promise<{ patientId: string } | undefined> {
  const patientId = await deps.identifierRepo.findActivePatientIdByIdentifier(
    tenantId,
    "abha_address",
    abhaAddress,
  );
  return patientId ? { patientId } : undefined;
}
