/** Event type name strings only. Envelope fields are `CreateEnvelopeInput` from `@hims/ts-sdk-events`. */

export const USER_MANAGEMENT_EVENT_USER_CREATED = "user-management.user.created" as const;
export const USER_MANAGEMENT_EVENT_USER_UPDATED = "user-management.user.updated" as const;
export const USER_MANAGEMENT_EVENT_USER_DEACTIVATED = "user-management.user.deactivated" as const;
export const USER_MANAGEMENT_EVENT_ROLE_ASSIGNED = "user-management.role.assigned" as const;
export const USER_MANAGEMENT_EVENT_ROLE_REVOKED = "user-management.role.revoked" as const;

export const USER_MANAGEMENT_EVENT_TYPES = [
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_ROLE_REVOKED,
] as const;

export type UserManagementEventType = (typeof USER_MANAGEMENT_EVENT_TYPES)[number];
