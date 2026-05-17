import type { UserStatus } from "../ports/index.js";
import {
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_ROLE_REVOKED,
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
  type UserManagementEventType,
} from "./constants.js";

/** Envelope + payload `event_contract_version` for user.created / user.updated (v2 payload shape). */
export const USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION = "2.0.0" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_STATUSES: ReadonlySet<UserStatus> = new Set(["active", "inactive", "suspended"]);

type ContractValidationResult = { ok: true } | { ok: false; errors: string[] };

function validateUuid(value: unknown, field: string): string | null {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    return `${field} must be a UUID`;
  }
  return null;
}

function isNullOrString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function validateNoAdditionalProperties(
  payload: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      errors.push(`payload.${key} is not allowed`);
    }
  }
  return errors;
}

/**
 * Flat payload for `user-management.user.created` and `user-management.user.updated`.
 * Optional keys are omitted when the corresponding `User` field is `undefined` (no `undefined`→`null` coercion).
 * Explicit `null` from persistence is emitted as `null`.
 */
export type UserEventPayload = {
  id: string;
  full_name: string;
  status: UserStatus;
  event_contract_version: typeof USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
  auth_user_id?: string | null;
};

export type UserCreatedEventPayload = UserEventPayload;

export type UserUpdatedEventPayload = UserEventPayload;

export type UserDeactivatedEventPayload = {
  id: string;
  reason: string | null;
};

/** Applied role template association (`user_roles` row identity). */
export type AppliedRoleTemplateAssociationPayload = {
  id: string;
  user_id: string;
  role_id: string;
};

export type UserManagementEventPayloadMap = {
  [USER_MANAGEMENT_EVENT_USER_CREATED]: UserCreatedEventPayload;
  [USER_MANAGEMENT_EVENT_USER_UPDATED]: UserUpdatedEventPayload;
  [USER_MANAGEMENT_EVENT_USER_DEACTIVATED]: UserDeactivatedEventPayload;
  [USER_MANAGEMENT_EVENT_ROLE_ASSIGNED]: AppliedRoleTemplateAssociationPayload;
  [USER_MANAGEMENT_EVENT_ROLE_REVOKED]: AppliedRoleTemplateAssociationPayload;
};

function validateOptionalNullOrString(
  p: Record<string, unknown>,
  key: "email" | "phone" | "username",
  errors: string[],
): void {
  if (!(key in p)) return;
  if (!isNullOrString(p[key])) {
    errors.push(`payload.${key} must be string or null`);
  }
}

function validateOptionalUuidOrNull(
  p: Record<string, unknown>,
  key: "org_id" | "auth_user_id",
  errors: string[],
): void {
  if (!(key in p)) return;
  if (
    !(
      p[key] === null ||
      (typeof p[key] === "string" && validateUuid(p[key], `payload.${key}`) === null)
    )
  ) {
    errors.push(`payload.${key} must be UUID or null`);
  }
}

/** `user.created` / `user.updated`: required core fields + payload `event_contract_version` 2.0.0; optional profile keys only when present. */
function validateUserEventPayload(payload: unknown): ContractValidationResult {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["payload must be an object"] };
  }
  const p = payload as Record<string, unknown>;
  const allowedKeys = new Set([
    "id",
    "full_name",
    "status",
    "event_contract_version",
    "email",
    "phone",
    "username",
    "org_id",
    "auth_user_id",
  ]);
  const errors = validateNoAdditionalProperties(p, allowedKeys);

  if (!("id" in p)) {
    errors.push("payload.id is required");
  } else {
    const idErr = validateUuid(p.id, "payload.id");
    if (idErr) errors.push(idErr);
  }

  if (!("full_name" in p)) {
    errors.push("payload.full_name is required");
  } else if (typeof p.full_name !== "string") {
    errors.push("payload.full_name must be a string");
  }

  if (!("status" in p)) {
    errors.push("payload.status is required");
  } else if (typeof p.status !== "string" || !USER_STATUSES.has(p.status as UserStatus)) {
    errors.push("payload.status must be one of active|inactive|suspended");
  }

  if (!("event_contract_version" in p)) {
    errors.push("payload.event_contract_version is required");
  } else if (p.event_contract_version !== USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION) {
    errors.push(
      `payload.event_contract_version must be ${USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION}`,
    );
  }

  validateOptionalNullOrString(p, "email", errors);
  validateOptionalNullOrString(p, "phone", errors);
  validateOptionalNullOrString(p, "username", errors);
  validateOptionalUuidOrNull(p, "org_id", errors);
  validateOptionalUuidOrNull(p, "auth_user_id", errors);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateAppliedRoleTemplateAssociationPayload(payload: unknown): ContractValidationResult {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["payload must be an object"] };
  }
  const p = payload as Record<string, unknown>;
  const errors = validateNoAdditionalProperties(
    p,
    new Set(["id", "user_id", "role_id"]),
  );
  const idErr = validateUuid(p.id, "payload.id");
  if (idErr) errors.push(idErr);
  const userErr = validateUuid(p.user_id, "payload.user_id");
  if (userErr) errors.push(userErr);
  const roleErr = validateUuid(p.role_id, "payload.role_id");
  if (roleErr) errors.push(roleErr);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateUserDeactivatedPayload(payload: unknown): ContractValidationResult {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["payload must be an object"] };
  }
  const p = payload as Record<string, unknown>;
  const errors = validateNoAdditionalProperties(p, new Set(["id", "reason"]));
  const idErr = validateUuid(p.id, "payload.id");
  if (idErr) errors.push(idErr);
  if (!isNullOrString(p.reason)) {
    errors.push("payload.reason must be string or null");
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

type EventContractVersion = "1.0.0" | "2.0.0";

type EventContractMap = {
  [K in UserManagementEventType]: {
    eventContractVersion: EventContractVersion;
    validatePayload: (
      payload: unknown,
    ) => payload is UserManagementEventPayloadMap[K];
    validatePayloadVerbose: (
      payload: unknown,
    ) => ContractValidationResult;
  };
};

export const USER_MANAGEMENT_EVENT_CONTRACTS: EventContractMap = {
  [USER_MANAGEMENT_EVENT_USER_CREATED]: {
    eventContractVersion: USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
    validatePayload: (payload): payload is UserCreatedEventPayload =>
      validateUserEventPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateUserEventPayload(payload),
  },
  [USER_MANAGEMENT_EVENT_USER_UPDATED]: {
    eventContractVersion: USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
    validatePayload: (payload): payload is UserUpdatedEventPayload =>
      validateUserEventPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateUserEventPayload(payload),
  },
  [USER_MANAGEMENT_EVENT_USER_DEACTIVATED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is UserDeactivatedEventPayload =>
      validateUserDeactivatedPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateUserDeactivatedPayload(payload),
  },
  [USER_MANAGEMENT_EVENT_ROLE_ASSIGNED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is AppliedRoleTemplateAssociationPayload =>
      validateAppliedRoleTemplateAssociationPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateAppliedRoleTemplateAssociationPayload(payload),
  },
  [USER_MANAGEMENT_EVENT_ROLE_REVOKED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is AppliedRoleTemplateAssociationPayload =>
      validateAppliedRoleTemplateAssociationPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateAppliedRoleTemplateAssociationPayload(payload),
  },
};
