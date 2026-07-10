import { sql, type DbInstance } from "@hims/ts-sdk-db";
import type { UserActivationFacts } from "../domain/user-activation.js";
import type { UserActivationStatusReaderPort } from "../ports/user-activation-status-reader.js";

type ActivationRow = {
  status: string;
  banned: boolean;
  ban_expires: Date | string | null;
  must_change_password: boolean;
};

/** node-postgres returns `{ rows }`; tolerate a bare array for forward-compat. */
function readRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

function toDateOrNull(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Resolves activation facts via a single read-only JOIN across UM's OWN two schemas:
 * `user_management.users` (platform status + the `auth_user_id` link) and better-auth's
 * `auth."user"` (ban flag / expiry). The auth schema is UM-owned (ADR-0003) and has no
 * Drizzle model, so this uses a parameterized raw query — the same cross-schema read
 * pattern Configurator already uses against `master_global.modules`.
 *
 * `LEFT JOIN` keeps users without a linked auth account resolvable: `banned` then
 * defaults to false (no auth account ⇒ no ban possible), and the platform status alone
 * decides activation.
 *
 * Type bridge: `auth."user".id` is `text` while `users.auth_user_id` is `uuid`, so the
 * join casts the (single, always-valid) uuid to text — `au.id = u.auth_user_id::text` —
 * rather than `au.id::uuid` (which would error should any unrelated auth row ever hold a
 * non-uuid id). The two columns carry the same value: the provisioner sets the better-auth
 * user id equal to the platform user id (create-password-auth-account-provisioner).
 */
export class DrizzleUserActivationStatusReader implements UserActivationStatusReaderPort {
  constructor(private readonly db: DbInstance) {}

  async getActivationFacts(tenantId: string, userId: string): Promise<UserActivationFacts | null> {
    const result = await this.db.execute(sql`
      SELECT u.status AS status,
             COALESCE(au.banned, false) AS banned,
             au."banExpires" AS ban_expires,
             u.must_change_password AS must_change_password
      FROM user_management.users AS u
      LEFT JOIN auth."user" AS au ON au.id = u.auth_user_id::text
      WHERE u.iq_tenant_id = ${tenantId} AND u.id = ${userId}
      LIMIT 1
    `);

    const [row] = readRows<ActivationRow>(result);
    if (row === undefined) return null;

    return {
      status: row.status,
      banned: row.banned === true,
      banExpires: toDateOrNull(row.ban_expires),
      mustChangePassword: row.must_change_password === true,
    };
  }
}
