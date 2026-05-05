export type UserStatus = "active" | "inactive" | "suspended";

export type UserKind = "user" | "service" | "agent";

export type RecoveryTier =
  | "standard"
  | "delegated"
  | "phone_recovery"
  | "admin_only"
  | "federated";

export interface User {
  id: string;
  iq_tenant_id: string;
  auth_user_id: string | null;
  kind: UserKind;
  org_id: string | null;
  employee_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  recovery_tier: RecoveryTier;
  phone_auth_enabled: boolean;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateUserData {
  iq_tenant_id: string;
  auth_user_id?: string | null;
  kind?: UserKind;
  org_id?: string | null;
  employee_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status?: UserStatus;
  recovery_tier?: RecoveryTier;
  created_by?: string | null;
}

export interface UpdateUserData {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  employee_id?: string | null;
  status?: UserStatus;
  recovery_tier?: RecoveryTier;
  must_change_password?: boolean;
  updated_by?: string | null;
}

export interface UserFilters {
  status?: UserStatus;
  role?: string;
  limit?: number;
  offset?: number;
}
