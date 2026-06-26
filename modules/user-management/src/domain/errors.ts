/** Issues classified in {@link ValidationError}; HTTP mapping uses {@link ValidationError#issue} + {@link UserManagementError#code}. */
export type ValidationIssue =
  | "full_name_invalid_type"
  | "full_name_empty"
  | "email_invalid_type"
  | "email_required"
  | "password_invalid_type"
  | "password_required"
  | "password_too_short"
  | "username_invalid_type"
  | "username_required"
  | "username_invalid_length"
  | "username_invalid_format"
  | "auth_user_not_linked"
  | "route_id_invalid"
  | "create_user_capability_ids_invalid"
  | "create_user_role_template_ids_invalid"
  | "create_user_role_template_capability_ids_invalid"
  | "create_user_role_template_capability_ids_requires_single_role"
  | "apply_role_template_ids_invalid"
  | "apply_role_template_capability_not_on_role"
  | "apply_role_template_capability_ids_empty"
  | "apply_role_template_capability_ids_invalid"
  | "detach_role_template_query_invalid"
  | "replace_user_capabilities_invalid"
  | "role_code_invalid_type"
  | "role_code_empty"
  | "role_type_invalid_type"
  | "role_type_empty"
  | "role_display_name_invalid_type"
  | "role_display_name_empty"
  | "replace_role_capabilities_invalid";

const VALIDATION_ISSUE_META: Record<ValidationIssue, { code: string; message: string }> = {
  full_name_invalid_type: {
    code: "INVALID_INPUT",
    message: "full_name must be a non-empty string.",
  },
  full_name_empty: {
    code: "FULL_NAME_REQUIRED",
    message: "full_name is required.",
  },
  email_invalid_type: {
    code: "INVALID_INPUT",
    message: "email must be a valid email string.",
  },
  email_required: {
    code: "EMAIL_REQUIRED",
    message: "email is required to create a login account.",
  },
  password_invalid_type: {
    code: "INVALID_INPUT",
    message: "password must be a string.",
  },
  password_required: {
    code: "PASSWORD_REQUIRED",
    message: "password is required.",
  },
  password_too_short: {
    code: "PASSWORD_TOO_SHORT",
    message: "password must be at least 8 characters long.",
  },
  username_invalid_type: {
    code: "INVALID_INPUT",
    message: "username must be a string.",
  },
  username_required: {
    code: "USERNAME_REQUIRED",
    message: "username is required to create a login account.",
  },
  username_invalid_length: {
    code: "INVALID_INPUT",
    message: "username must be between 3 and 64 characters.",
  },
  username_invalid_format: {
    code: "INVALID_INPUT",
    message: "username may only contain letters, numbers, underscores, and hyphens.",
  },
  auth_user_not_linked: {
    code: "AUTH_USER_NOT_LINKED",
    message: "User has no linked authentication account.",
  },
  route_id_invalid: {
    code: "INVALID_INPUT",
    message: "route parameter id must be a UUID.",
  },
  create_user_capability_ids_invalid: {
    code: "INVALID_INPUT",
    message: "capability_ids must be an array of UUID strings.",
  },
  create_user_role_template_ids_invalid: {
    code: "INVALID_INPUT",
    message: "role_template_ids must be an array of UUID strings.",
  },
  create_user_role_template_capability_ids_invalid: {
    code: "INVALID_INPUT",
    message: "role_template_capability_ids must be an array of UUID strings.",
  },
  create_user_role_template_capability_ids_requires_single_role: {
    code: "INVALID_INPUT",
    message:
      "role_template_capability_ids may only be sent when exactly one role_template_id is provided.",
  },
  apply_role_template_ids_invalid: {
    code: "INVALID_INPUT",
    message: "user_id and role_id are required UUID strings.",
  },
  apply_role_template_capability_not_on_role: {
    code: "INVALID_INPUT",
    message: "Each capability id must belong to the role template being applied.",
  },
  apply_role_template_capability_ids_empty: {
    code: "INVALID_INPUT",
    message: "role_template_capability_ids must not be an empty array.",
  },
  apply_role_template_capability_ids_invalid: {
    code: "INVALID_INPUT",
    message: "role_template_capability_ids must contain only UUID strings.",
  },
  detach_role_template_query_invalid: {
    code: "INVALID_INPUT",
    message: "role_id route parameter must be a UUID string.",
  },
  replace_user_capabilities_invalid: {
    code: "INVALID_INPUT",
    message: "capability_ids must be an array of non-empty UUID strings.",
  },
  role_code_invalid_type: {
    code: "INVALID_INPUT",
    message: "code must be a non-empty string.",
  },
  role_code_empty: {
    code: "ROLE_CODE_REQUIRED",
    message: "code is required.",
  },
  role_type_invalid_type: {
    code: "INVALID_INPUT",
    message: "role_type must be a non-empty string.",
  },
  role_type_empty: {
    code: "ROLE_TYPE_REQUIRED",
    message: "role_type is required.",
  },
  role_display_name_invalid_type: {
    code: "INVALID_INPUT",
    message: "display_name must be a non-empty string.",
  },
  role_display_name_empty: {
    code: "ROLE_DISPLAY_NAME_REQUIRED",
    message: "display_name is required.",
  },
  replace_role_capabilities_invalid: {
    code: "INVALID_INPUT",
    message: "capability_ids must be an array of non-empty UUID strings.",
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

/** Inactive or suspended users must not sign in or receive access tokens. */
export class UserAccountDisabledError extends UserManagementError {
  constructor(message = "This account has been deactivated.") {
    super("USER_ACCOUNT_DISABLED", message);
  }
}

/** PEP did not attach `request.cerbosPrincipal` before /auth/principal (mis-ordered plugins or missing enrichment). */
export class CerbosPrincipalUnavailableError extends UserManagementError {
  constructor() {
    super(
      "CERBOS_PRINCIPAL_UNAVAILABLE",
      "Enriched principal is not available on the request; principal enrichment must run before this route.",
    );
  }
}

export class RoleNotFoundError extends UserManagementError {
  constructor(public readonly roleId?: string) {
    super("ROLE_NOT_FOUND", "Role not found for this tenant.");
  }
}

export class CapabilityNotFoundError extends UserManagementError {
  constructor(public readonly capabilityId?: string) {
    super("CAPABILITY_NOT_FOUND", "Capability not found in the catalog.");
  }
}

/** Runtime capability is not assignable for the tenant (module not enabled). */
export class CapabilityNotEntitledForTenantError extends UserManagementError {
  constructor(public readonly capabilityId?: string) {
    super(
      "CAPABILITY_NOT_ENTITLED_FOR_TENANT",
      "One or more capabilities are not assignable for this tenant.",
    );
  }
}

/** `capabilities.module` or related slug failed kebab-case validation. */
export class InvalidModuleSlugError extends UserManagementError {
  constructor(message: string) {
    super("INVALID_MODULE_SLUG", message);
  }
}

/** Invalid combination of nullable provenance columns on `capabilities`. */
export class InvalidCapabilityProvenanceError extends UserManagementError {
  constructor(message: string) {
    super("INVALID_CAPABILITY_PROVENANCE", message);
  }
}

/** `capabilities.capability_key` failed canonical runtime vocabulary validation. */
export class InvalidCapabilityKeyError extends UserManagementError {
  constructor(message: string) {
    super("INVALID_CAPABILITY_KEY", message);
  }
}

export type ModuleEntitlementLookupErrorOptions = Readonly<{
  cause?: unknown;
  /** Tenant-enabled Configurator `module_id` values with no Master Data catalog row. */
  unknownModuleIds?: readonly string[];
}>;

/** Configurator or Master Data module integration lookup failed; callers must fail closed. */
export class ModuleEntitlementLookupError extends UserManagementError {
  public readonly unknownModuleIds?: readonly string[];

  constructor(
    public readonly source: "configurator" | "master_data",
    options?: ModuleEntitlementLookupErrorOptions,
  ) {
    const unknownModuleIds = options?.unknownModuleIds?.filter(
      (id) => typeof id === "string" && id.trim().length > 0,
    );
    const message =
      unknownModuleIds !== undefined && unknownModuleIds.length > 0
        ? `Tenant-enabled module entitlement could not be resolved: ${unknownModuleIds.length} enabled module id(s) are missing from the Master Data catalog.`
        : "Tenant-enabled module entitlement could not be resolved.";
    super("MODULE_ENTITLEMENT_LOOKUP_FAILED", message, {
      retryable: true,
      cause: options?.cause,
    });
    if (unknownModuleIds !== undefined && unknownModuleIds.length > 0) {
      this.unknownModuleIds = unknownModuleIds;
    }
  }
}

/** @deprecated Use {@link ModuleEntitlementLookupError}. */
export const TenantEntitlementLookupError = ModuleEntitlementLookupError;

export class DuplicateRoleCodeError extends UserManagementError {
  constructor(public readonly roleCode?: string) {
    super("ROLE_CODE_DUPLICATE", "A role with this code already exists for this tenant.");
  }
}

export class RoleInUseError extends UserManagementError {
  constructor(public readonly roleId?: string) {
    super("ROLE_IN_USE", "This role cannot be deleted while assignments still exist.");
  }
}

export class DuplicateUserRoleTemplateError extends UserManagementError {
  constructor() {
    super("USER_ROLE_TEMPLATE_DUPLICATE", "This role template is already applied to the user.");
  }
}

export class AuthEmailConflictError extends UserManagementError {
  constructor(public readonly email?: string) {
    super("AUTH_EMAIL_CONFLICT", "A login account with this email already exists.");
  }
}

export class AuthAccountProvisioningError extends UserManagementError {
  constructor(options?: Readonly<{ cause?: unknown }>) {
    super(
      "AUTH_ACCOUNT_PROVISIONING_FAILED",
      "Login account could not be provisioned after the platform user was created.",
      options ?? {},
    );
  }
}

export class AuthAccountIdentityMismatchError extends UserManagementError {
  constructor() {
    super(
      "AUTH_ACCOUNT_IDENTITY_MISMATCH",
      "Auth account id does not match the platform user id.",
    );
  }
}

export class DuplicateUsernameError extends UserManagementError {
  constructor(public readonly username?: string) {
    super("USERNAME_CONFLICT", "A user with this username already exists for this tenant.");
  }
}

export class UserRoleTemplateNotFoundError extends UserManagementError {
  constructor() {
    super("USER_ROLE_TEMPLATE_NOT_FOUND", "Role template association not found for this tenant.");
  }
}

export class TenantMismatchError extends UserManagementError {
  constructor() {
    super("TENANT_CONTEXT_MISMATCH", "iq_tenant_id header must match JWT tenant claim");
  }
}

export class ApiKeyInvalidError extends UserManagementError {
  constructor() {
    super("API_KEY_INVALID", "Invalid API key");
  }
}

export class RbacIntegrityViolationError extends UserManagementError {
  constructor(public readonly reason: "orphan_user_role_template") {
    super(
      "RBAC_INTEGRITY_VIOLATION",
      "RBAC integrity violation: orphan user role template association detected",
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
