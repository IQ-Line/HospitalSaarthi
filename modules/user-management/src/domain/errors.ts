/** Issues classified in {@link ValidationError}; HTTP mapping uses {@link ValidationError#issue} + {@link UserManagementError#code}. */
export type ValidationIssue = "full_name_invalid_type" | "full_name_empty" | "assign_role_ids_invalid";

const VALIDATION_ISSUE_META: Record<ValidationIssue, { code: string; message: string }> = {
  full_name_invalid_type: {
    code: "INVALID_INPUT",
    message: "full_name must be a non-empty string.",
  },
  full_name_empty: {
    code: "FULL_NAME_REQUIRED",
    message: "full_name is required.",
  },
  assign_role_ids_invalid: {
    code: "INVALID_INPUT",
    message: "user_id and role_id are required.",
  },
};

/**
 * Canonical base for user-management domain/application failures.
 * `code` is stable for narrowing, telemetry, and transport mapping (not necessarily identical to HTTP body when masked).
 */
export class UserManagementError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly options: Readonly<{ retryable?: boolean; cause?: unknown }> = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
  }

  get retryable(): boolean | undefined {
    return this.options.retryable;
  }
}

export class ValidationError extends UserManagementError {
  constructor(public readonly issue: ValidationIssue) {
    const m = VALIDATION_ISSUE_META[issue];
    super(m.code, m.message);
  }
}

export class UserNotFoundError extends UserManagementError {
  constructor(public readonly userId?: string) {
    super("USER_NOT_FOUND", "User not found for this tenant.");
  }
}

export class RoleNotFoundError extends UserManagementError {
  constructor(public readonly roleId?: string) {
    super("ROLE_NOT_FOUND", "Role not found for this tenant.");
  }
}

export class DuplicateRoleAssignmentError extends UserManagementError {
  constructor() {
    super("ROLE_ASSIGNMENT_DUPLICATE", "This role is already assigned to the user.");
  }
}

export class TenantMismatchError extends UserManagementError {
  constructor() {
    super("TENANT_CONTEXT_MISMATCH", "iq_tenant_id header must match JWT tenant claim");
  }
}

export class RbacIntegrityViolationError extends UserManagementError {
  constructor(public readonly reason: "orphan_role_assignment") {
    super(
      "RBAC_INTEGRITY_VIOLATION",
      "RBAC integrity violation: orphan role assignment detected",
    );
  }
}

/** Insert/update returned no row or other invariant broken in persistence adapter. */
export class UnexpectedPersistenceError extends UserManagementError {
  constructor(options?: Readonly<{ cause?: unknown }>) {
    super("UNEXPECTED_PERSISTENCE", "Unexpected persistence failure.", options ?? {});
  }
}

/** Invalid test/dev seed data (e.g. blank role code after normalization). */
export class InvalidRoleSeedError extends UserManagementError {
  constructor(options?: Readonly<{ cause?: unknown }>) {
    super("INVALID_ROLE_SEED", "Invalid role seed: code empty after normalization.", options ?? {});
  }
}
