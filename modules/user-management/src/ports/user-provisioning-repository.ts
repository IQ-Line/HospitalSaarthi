import type { CreateUserInput, RecoveryTier, User } from "../domain/types.js";

export type RoleTemplateGrantPlan = {
  roleId: string;
  capabilityIds: string[];
};

export type ProvisionUserWithAccessInput = {
  userId: string;
  /** `email` is the optional real contact email (null when the user has none). */
  user: CreateUserInput & { email: string | null };
  /** Derived recovery tier (authn spec §3.2): 'standard' when a real email exists, else 'admin_only'. */
  recoveryTier: RecoveryTier;
  authUserId: string;
  manualCapabilityIds: string[];
  roleTemplateGrants: RoleTemplateGrantPlan[];
  actorId: string | null;
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
