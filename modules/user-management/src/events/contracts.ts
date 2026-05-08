import type { UserStatus } from "../ports/index.js";
import {
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_ROLE_REVOKED,
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
  type UserManagementEventType,
} from "./constants.js";

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

export type UserCreatedEventPayload = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  username: string | null;
  org_id: string | null;
  auth_user_id: string | null;
};

export type UserUpdatedEventPayload = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  username: string | null;
  org_id: string | null;
  auth_user_id: string | null;
};

export type UserDeactivatedEventPayload = {
  id: string;
  reason: string | null;
};

export type RoleAssignedEventPayload = {
  id: string;
  user_id: string;
  role_id: string;
};

export type RoleRevokedEventPayload = {
  id: string;
  user_id: string;
  role_id: string;
};

export type UserManagementEventPayloadMap = {
  [USER_MANAGEMENT_EVENT_USER_CREATED]: UserCreatedEventPayload;
  [USER_MANAGEMENT_EVENT_USER_UPDATED]: UserUpdatedEventPayload;
  [USER_MANAGEMENT_EVENT_USER_DEACTIVATED]: UserDeactivatedEventPayload;
  [USER_MANAGEMENT_EVENT_ROLE_ASSIGNED]: RoleAssignedEventPayload;
  [USER_MANAGEMENT_EVENT_ROLE_REVOKED]: RoleRevokedEventPayload;
};

function validateUserPayload(
  payload: unknown,
  requireFullName: boolean,
): ContractValidationResult {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["payload must be an object"] };
  }
  const p = payload as Record<string, unknown>;
  const errors = validateNoAdditionalProperties(
    p,
    new Set([
      "id",
      "full_name",
      "email",
      "phone",
      "status",
      "username",
      "org_id",
      "auth_user_id",
    ]),
  );

  const idErr = validateUuid(p.id, "payload.id");
  if (idErr) errors.push(idErr);
  if (requireFullName && typeof p.full_name !== "string") {
    errors.push("payload.full_name must be a string");
  }
  if (!requireFullName && p.full_name !== undefined && typeof p.full_name !== "string") {
    errors.push("payload.full_name must be a string");
  }
  if (p.email !== undefined && !isNullOrString(p.email)) {
    errors.push("payload.email must be string or null");
  }
  if (p.phone !== undefined && !isNullOrString(p.phone)) {
    errors.push("payload.phone must be string or null");
  }
  if (
    p.status !== undefined &&
    (typeof p.status !== "string" || !USER_STATUSES.has(p.status as UserStatus))
  ) {
    errors.push("payload.status must be one of active|inactive|suspended");
  }
  if (p.username !== undefined && !isNullOrString(p.username)) {
    errors.push("payload.username must be string or null");
  }
  if (
    p.org_id !== undefined &&
    !(p.org_id === null || validateUuid(p.org_id, "payload.org_id") === null)
  ) {
    errors.push("payload.org_id must be UUID or null");
  }
  if (
    p.auth_user_id !== undefined &&
    !(p.auth_user_id === null || validateUuid(p.auth_user_id, "payload.auth_user_id") === null)
  ) {
    errors.push("payload.auth_user_id must be UUID or null");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateRoleAssignmentPayload(payload: unknown): ContractValidationResult {
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

type EventContractMap = {
  [K in UserManagementEventType]: {
    eventContractVersion: "1.0.0";
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
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is UserCreatedEventPayload =>
      validateUserPayload(payload, true).ok,
    validatePayloadVerbose: (payload) => validateUserPayload(payload, true),
  },
  [USER_MANAGEMENT_EVENT_USER_UPDATED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is UserUpdatedEventPayload =>
      validateUserPayload(payload, false).ok,
    validatePayloadVerbose: (payload) => validateUserPayload(payload, false),
  },
  [USER_MANAGEMENT_EVENT_USER_DEACTIVATED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is UserDeactivatedEventPayload =>
      validateUserDeactivatedPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateUserDeactivatedPayload(payload),
  },
  [USER_MANAGEMENT_EVENT_ROLE_ASSIGNED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is RoleAssignedEventPayload =>
      validateRoleAssignmentPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateRoleAssignmentPayload(payload),
  },
  [USER_MANAGEMENT_EVENT_ROLE_REVOKED]: {
    eventContractVersion: "1.0.0",
    validatePayload: (payload): payload is RoleRevokedEventPayload =>
      validateRoleAssignmentPayload(payload).ok,
    validatePayloadVerbose: (payload) => validateRoleAssignmentPayload(payload),
  },
};
