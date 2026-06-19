import { UserAccountDisabledError } from "../domain/errors.js";
import type { UserStatus } from "../domain/types.js";

/** Blocks sign-in, JWT issuance, and principal enrichment for non-active platform users. */
export function assertUserCanAuthenticate(user: { status: UserStatus }): void {
  if (user.status === "active") {
    return;
  }
  if (user.status === "inactive") {
    throw new UserAccountDisabledError("This account has been deactivated.");
  }
  throw new UserAccountDisabledError("This account has been suspended.");
}
