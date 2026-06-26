import type { HimsBetterAuthInstance } from "./create-hims-better-auth.js";
import type { AuthPasswordAdminPort } from "@hims/user-management";

type BetterAuthPasswordAdminContext = {
  password: { hash: (password: string) => Promise<string> };
  internalAdapter: {
    updatePassword: (userId: string, hashedPassword: string) => Promise<void>;
    deleteSessions: (userId: string) => Promise<void>;
  };
};

type BetterAuthWithContext = HimsBetterAuthInstance & {
  $context: Promise<BetterAuthPasswordAdminContext>;
};

export function createAuthPasswordAdmin(auth: HimsBetterAuthInstance): AuthPasswordAdminPort {
  const authWithContext = auth as BetterAuthWithContext;

  return {
    async setUserPassword(authUserId, newPassword) {
      const ctx = await authWithContext.$context;
      const hashedPassword = await ctx.password.hash(newPassword);
      await ctx.internalAdapter.updatePassword(authUserId, hashedPassword);
    },
    async revokeUserSessions(authUserId) {
      const ctx = await authWithContext.$context;
      await ctx.internalAdapter.deleteSessions(authUserId);
    },
  };
}
