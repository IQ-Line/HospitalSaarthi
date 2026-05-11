import type { User } from "../ports/index.js";
import {
  USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
  type UserEventPayload,
} from "./contracts.js";

/**
 * Builds the flat payload for `user-management.user.created` and
 * `user-management.user.updated`. Optional `User` fields are included only when
 * defined (`undefined` is not coerced to `null`); explicit `null` is preserved.
 */
export function ensureUserEventPayload(user: User): UserEventPayload {
  const payload: UserEventPayload = {
    id: user.id,
    full_name: user.full_name,
    status: user.status,
    event_contract_version: USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
  };
  if (user.email !== undefined) {
    payload.email = user.email;
  }
  if (user.phone !== undefined) {
    payload.phone = user.phone;
  }
  if (user.username !== undefined) {
    payload.username = user.username;
  }
  if (user.org_id !== undefined) {
    payload.org_id = user.org_id;
  }
  if (user.auth_user_id !== undefined) {
    payload.auth_user_id = user.auth_user_id;
  }
  return payload;
}
