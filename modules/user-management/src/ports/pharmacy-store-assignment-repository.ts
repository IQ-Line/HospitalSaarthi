import type {
  PharmacyStoreAccessSnapshot,
  PharmacyStoreAssignmentRow,
} from "../domain/pharmacy-store-access.types.js";

export interface PharmacyStoreAssignmentRepository {
  getForUser(tenantId: string, userId: string): Promise<PharmacyStoreAccessSnapshot>;

  replaceForUser(
    tenantId: string,
    userId: string,
    assignments: PharmacyStoreAssignmentRow[],
  ): Promise<PharmacyStoreAccessSnapshot>;

  clearForUser(tenantId: string, userId: string): Promise<void>;
}
