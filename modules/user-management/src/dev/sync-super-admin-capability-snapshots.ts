import type { DbInstance } from "@hims/ts-sdk-db";
import { eq } from "drizzle-orm";
import {
  capabilities,
  role_capabilities,
  user_capabilities,
} from "../schema/tables.js";

export type SyncSuperAdminCapabilitySnapshotsInput = {
  tenantId: string;
  userId: string;
  roleId: string;
};

/**
 * Grants every active catalog capability to the super-admin role and refreshes the
 * user's `user_capabilities` snapshot (Cerbos PEP reads snapshots only).
 */
export async function syncSuperAdminCapabilitySnapshots(
  db: DbInstance,
  input: SyncSuperAdminCapabilitySnapshotsInput,
): Promise<{ capabilityCount: number }> {
  const activeRows = await db
    .select({ id: capabilities.id })
    .from(capabilities)
    .where(eq(capabilities.is_active, true));

  const capabilityIds = activeRows.map((row) => row.id);
  if (capabilityIds.length === 0) {
    return { capabilityCount: 0 };
  }

  await db
    .insert(role_capabilities)
    .values(
      capabilityIds.map((capabilityId) => ({
        iq_tenant_id: input.tenantId,
        role_id: input.roleId,
        capability_id: capabilityId,
      })),
    )
    .onConflictDoNothing({
      target: [
        role_capabilities.iq_tenant_id,
        role_capabilities.role_id,
        role_capabilities.capability_id,
      ],
    });

  const grantedAt = new Date();
  await db
    .insert(user_capabilities)
    .values(
      capabilityIds.map((capabilityId) => ({
        iq_tenant_id: input.tenantId,
        user_id: input.userId,
        capability_id: capabilityId,
        grant_source: "role_template" as const,
        source_role_id: input.roleId,
        granted_by_user_id: null,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      })),
    )
    .onConflictDoUpdate({
      target: [
        user_capabilities.iq_tenant_id,
        user_capabilities.user_id,
        user_capabilities.capability_id,
      ],
      set: {
        grant_source: "role_template",
        source_role_id: input.roleId,
        granted_by_user_id: null,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      },
    });

  return { capabilityCount: capabilityIds.length };
}
