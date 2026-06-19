import { eq } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { AuthSessionRevokerPort } from "../../../../modules/user-management/src/ports/auth-session-revoker.js";
import type { UserRepository } from "../../../../modules/user-management/src/ports/index.js";
import { authSession } from "./auth-schema.js";

export class DrizzleAuthSessionRevoker implements AuthSessionRevokerPort {
  constructor(
    private readonly db: DbInstance,
    private readonly userRepository: UserRepository,
  ) {}

  async revokeAllSessionsForPlatformUser(platformUserId: string): Promise<void> {
    const trimmed = platformUserId.trim();
    if (trimmed.length === 0) {
      return;
    }

    const row = await this.userRepository.findUserByGlobalId(trimmed);
    const authUserId = row?.auth_user_id?.trim() || row?.id?.trim() || trimmed;

    await this.db.delete(authSession).where(eq(authSession.userId, authUserId));
  }
}
