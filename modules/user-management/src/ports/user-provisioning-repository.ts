import type { CreateUserInput, User } from "../domain/types.js";
import type { PharmacyStoreAssignmentRow } from "../domain/pharmacy-store-access.types.js";

export type RoleTemplateGrantPlan = {
  roleId: string;
  capabilityIds: string[];
};

export type ProvisionUserWithAccessInput = {
  userId: string;
  user: CreateUserInput & { email: string };
  authUserId: string;
  manualCapabilityIds: string[];
  roleTemplateGrants: RoleTemplateGrantPlan[];
  actorId: string | null;
  pharmacyStoreAssignments?: PharmacyStoreAssignmentRow[] | null;
};

/**
 * Atomic persistence for user creation plus initial access grants.
 * Auth account provisioning remains outside this boundary (better-auth).
 */
export interface UserProvisioningRepository {
  provisionUserWithAccess(
    tenantId: string,
    input: ProvisionUserWithAccessInput,
  ): Promise<User>;
}
