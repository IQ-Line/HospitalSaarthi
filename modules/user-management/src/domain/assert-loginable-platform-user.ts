import { PlatformUserMutationForbiddenError } from "./errors.js";
import type { User, UserKind } from "./types.js";

/** Loginable humans (`kind` absent or `user`). Partners use dedicated integration lifecycle APIs. */
export function isLoginablePlatformUserKind(kind: UserKind | undefined): boolean {
  return kind === undefined || kind === "user";
}

export function assertLoginablePlatformUser(user: User): void {
  const kind = user.kind ?? "user";
  if (!isLoginablePlatformUserKind(kind)) {
    throw new PlatformUserMutationForbiddenError(kind);
  }
}
