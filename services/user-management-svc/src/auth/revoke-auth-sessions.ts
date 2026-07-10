import { eq } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { AuthSessionRevokerPort, UserRepository } from "@hims/user-management";
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
