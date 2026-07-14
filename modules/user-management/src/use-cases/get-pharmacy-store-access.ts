import type { PharmacyStoreAssignmentRepository } from "../ports/pharmacy-store-assignment-repository.js";
import type { PharmacyStoreAccessSnapshot } from "../domain/pharmacy-store-access.types.js";

export type GetPharmacyStoreAccessDeps = {
  pharmacyStoreAssignmentRepository: PharmacyStoreAssignmentRepository;
};

export async function getUserPharmacyStoreAccess(
  deps: GetPharmacyStoreAccessDeps,
  tenantId: string,
  userId: string,
): Promise<PharmacyStoreAccessSnapshot> {
  return deps.pharmacyStoreAssignmentRepository.getForUser(tenantId, userId);
}
