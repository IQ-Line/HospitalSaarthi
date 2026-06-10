import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { authSession, authUser } from "./auth-schema.js";

export const INTEGRATION_REFRESH_EXPIRY_SECONDS = 3600 * 24 * 7;

function generateSessionToken(): string {
  return randomBytes(24).toString("base64url").slice(0, 32);
}

export async function createIntegrationRefreshSession(
  db: DbInstance,
  authUserId: string,
): Promise<{ refresh_token: string; refresh_expires_in: number }> {
  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.id, authUserId))
    .limit(1);
  if (!existing) {
    throw new Error(`Cannot issue refresh session: auth user ${authUserId} not found`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INTEGRATION_REFRESH_EXPIRY_SECONDS * 1000);
  const refresh_token = generateSessionToken();

  await db.insert(authSession).values({
    id: randomUUID(),
    expiresAt,
    token: refresh_token,
    createdAt: now,
    updatedAt: now,
    ipAddress: "",
    userAgent: "integration-api-key",
    userId: authUserId,
  });

  return {
    refresh_token,
    refresh_expires_in: INTEGRATION_REFRESH_EXPIRY_SECONDS,
  };
}
