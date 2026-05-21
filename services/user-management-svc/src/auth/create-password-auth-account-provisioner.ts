import { eq } from "drizzle-orm";
import type {
  AuthAccountProvisioner,
  CreatePasswordAuthAccountInput,
  CreatePasswordAuthAccountResult,
} from "@hims/user-management";
import {
  AuthAccountIdentityMismatchError,
  AuthAccountProvisioningError,
  AuthEmailConflictError,
} from "@hims/user-management";
import type { DbInstance } from "@hims/ts-sdk-db";
import { authUser } from "./auth-schema.js";
import type { HimsBetterAuthInstance } from "./create-hims-better-auth.js";

type BetterAuthServerApi = {
  api: {
    signUpEmail(args: {
      body: {
        email: string;
        iq_tenant_id: string;
        name: string;
        password: string;
        platform_user_id: string;
      };
    }): Promise<unknown>;
  };
};

async function readAuthUserByEmail(
  db: DbInstance,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const [row] = await db
    .select({ id: authUser.id, email: authUser.email })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);
  return row ?? null;
}

async function readAuthUserById(
  db: DbInstance,
  id: string,
): Promise<{ id: string; email: string } | null> {
  const [row] = await db
    .select({ id: authUser.id, email: authUser.email })
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
      const existing = await readAuthUserByEmail(db, input.email);
      if (existing !== null) {
        throw new AuthEmailConflictError(input.email);
      }

      try {
        await serverApi.api.signUpEmail({
          body: {
            name: input.fullName,
            email: input.email,
            password: input.password,
            iq_tenant_id: input.tenantId,
            platform_user_id: input.platformUserId,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AuthEmailConflictError(input.email);
        }
        throw error;
      }

      const byPlatformId = await readAuthUserById(db, input.platformUserId);
      const created = byPlatformId ?? (await readAuthUserByEmail(db, input.email));
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
