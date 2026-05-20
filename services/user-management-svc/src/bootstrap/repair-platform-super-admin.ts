import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import {
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
} from "@hims/dev-bootstrap";
import { roles, syncSuperAdminCapabilitySnapshots, user_roles, users } from "@hims/user-management";

/**
 * Refreshes platform super-admin `user_capabilities` snapshots from every active catalog row.
 * Safe to run on each non-production startup so Cerbos always sees `users:users:create` / `user-roles:role:assign`.
 */
export async function repairPlatformSuperAdminCapabilitySnapshots(
  db: DbInstance,
): Promise<{ repaired: boolean; capabilityCount: number }> {
  const [platformUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
        eq(users.email, DEVELOPMENT_BOOTSTRAP_USER_EMAIL),
      ),
    )
    .limit(1);

  if (!platformUser) {
    return { repaired: false, capabilityCount: 0 };
  }

  const [superAdminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.iq_tenant_id, DEVELOPMENT_BOOTSTRAP_TENANT_ID),
        eq(roles.code, DEVELOPMENT_BOOTSTRAP_ROLE_CODE),
      ),
    )
    .limit(1);

  if (!superAdminRole) {
    return { repaired: false, capabilityCount: 0 };
  }

  await db
    .insert(user_roles)
    .values({
      iq_tenant_id: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
      user_id: platformUser.id,
      role_id: superAdminRole.id,
    })
    .onConflictDoNothing({
      target: [user_roles.iq_tenant_id, user_roles.user_id, user_roles.role_id],
    });

  const synced = await syncSuperAdminCapabilitySnapshots(db, {
    tenantId: DEVELOPMENT_BOOTSTRAP_TENANT_ID,
    userId: platformUser.id,
    roleId: superAdminRole.id,
  });

  return { repaired: true, capabilityCount: synced.capabilityCount };
}
