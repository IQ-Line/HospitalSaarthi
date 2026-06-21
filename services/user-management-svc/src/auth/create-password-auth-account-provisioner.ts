import { eq } from "drizzle-orm";
import type {
  AuthAccountProvisioner,
  CreatePasswordAuthAccountInput,
  CreatePasswordAuthAccountResult,
} from "@hims/user-management";
import {
  AuthAccountIdentityMismatchError,
  AuthAccountProvisioningError,
  DuplicateUsernameError,
} from "@hims/user-management";
import type { DbInstance } from "@hims/ts-sdk-db";
import { authUser } from "./auth-schema.js";
import type { HimsBetterAuthInstance } from "./create-hims-better-auth.js";
import { toSyntheticAuthEmail } from "./synthetic-email.js";

type BetterAuthServerApi = {
  api: {
    signUpEmail(args: {
      body: {
        email: string;
        iq_tenant_id: string;
        name: string;
        password: string;
        platform_user_id: string;
        username: string;
      };
    }): Promise<unknown>;
  };
};

async function readAuthUserByUsername(
  db: DbInstance,
  username: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.username, username))
    .limit(1);
  return row ?? null;
}

async function readAuthUserById(
  db: DbInstance,
  id: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.id, id))
    .limit(1);
  return row ?? null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

export function createPasswordAuthAccountProvisioner(
  db: DbInstance,
  auth: HimsBetterAuthInstance,
): AuthAccountProvisioner {
  const serverApi = auth as unknown as BetterAuthServerApi;

  return {
    async createPasswordAccount(
      input: CreatePasswordAuthAccountInput,
    ): Promise<CreatePasswordAuthAccountResult> {
      // The username plugin lowercases in place; mirror that so our pre-check matches the stored value.
      const username = input.username.trim().toLowerCase();
      // Synthetic, non-routable identity anchor (authn spec §15.1) — a real contact email never
      // enters the better-auth boundary; it lives only on the platform `users.email`.
      const email = toSyntheticAuthEmail(username);

      const existing = await readAuthUserByUsername(db, username);
      if (existing !== null) {
        throw new DuplicateUsernameError(username);
      }

      try {
        await serverApi.api.signUpEmail({
          body: {
            name: input.fullName,
            email,
            password: input.password,
            iq_tenant_id: input.tenantId,
            platform_user_id: input.platformUserId,
            username,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          // The synthetic email is f(username); a synthetic-email OR username unique collision both
          // reduce to "this username is taken".
          throw new DuplicateUsernameError(username);
        }
        throw error;
      }

      const created =
        (await readAuthUserById(db, input.platformUserId)) ??
        (await readAuthUserByUsername(db, username));
      if (created === null) {
        throw new AuthAccountProvisioningError();
      }
      if (created.id !== input.platformUserId) {
        throw new AuthAccountIdentityMismatchError();
      }

      return { authUserId: created.id };
    },
  };
}
