/**
 * User Management domain entities — tenant-scoped business state (LLD `user_management` schema concepts).
 * Richer than OpenAPI transport shapes; adapters map to/from HTTP and persistence.
 */

export interface UserEntity {
  id: string;
  tenantId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoleAssignmentEntity {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  createdAt?: Date;
}

export interface PrincipalEntity {
  id: string;
  /** Role names from JWT / assignments (e.g. `physician`), not `roles.id` UUIDs. */
  roles: string[];
  attributes: {
    tenantId: string;
    department: string | null;
    orgId: string | null;
    capabilities: string[];
    delegatedCapabilities: string[];
    clearances: Record<string, string>;
  };
}
