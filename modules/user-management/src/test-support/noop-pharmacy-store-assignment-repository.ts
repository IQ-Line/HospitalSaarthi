import type { PharmacyStoreAccessSnapshot } from "../domain/pharmacy-store-access.types.js";
import type { PharmacyStoreAssignmentRepository } from "../ports/pharmacy-store-assignment-repository.js";

const EMPTY_ACCESS: PharmacyStoreAccessSnapshot = {
  primary_store_id: null,
  secondary_store_ids: [],
};

export class NoopPharmacyStoreAssignmentRepository implements PharmacyStoreAssignmentRepository {
  async getForUser(): Promise<PharmacyStoreAccessSnapshot> {
    return EMPTY_ACCESS;
  }

  async replaceForUser(): Promise<PharmacyStoreAccessSnapshot> {
    return EMPTY_ACCESS;
  }

  async clearForUser(): Promise<void> {}
}
