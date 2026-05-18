import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, ne } from "drizzle-orm";
import { user_capabilities } from "../schema/tables.js";

export type UserCapabilityGrantRef = {
  id: string;
  capability_id: string;
  grant_source: string;
  source_role_id: string | null;
  revoked_at: Date | string | null;
};

export type RoleTemplateCapabilitySyncPlan = {
  revokeGrantIds: string[];
  upsertCapabilityIds: string[];
};

/**
 * Plans snapshot synchronization for a role template apply/re-apply.
 * Revokes only active `role_template` grants scoped to `roleId` outside the desired set.
 * Upserts missing/revoked role-scoped grants without touching manual/delegated/system rows.
 */
export function planRoleTemplateCapabilitySync(
  desiredCapabilityIds: readonly string[],
  grants: readonly UserCapabilityGrantRef[],
  roleId: string,
): RoleTemplateCapabilitySyncPlan {
  const desired = new Set(desiredCapabilityIds);
  const isActive = (grant: UserCapabilityGrantRef): boolean => grant.revoked_at === null;

  const activeGrants = grants.filter(isActive);
  const rowByCapabilityId = new Map(grants.map((grant) => [grant.capability_id, grant]));
  const activeByCapabilityId = new Map(
    activeGrants.map((grant) => [grant.capability_id, grant]),
  );

  const revokeGrantIds = activeGrants
    .filter(
      (grant) =>
        grant.grant_source === "role_template" &&
        grant.source_role_id === roleId &&
        !desired.has(grant.capability_id),
    )
    .map((grant) => grant.id);

  const upsertCapabilityIds: string[] = [];
  for (const capabilityId of desired) {
    const active = activeByCapabilityId.get(capabilityId);
    if (active?.grant_source === "manual") {
      continue;
    }
    if (
      active?.grant_source === "role_template" &&
      active.source_role_id === roleId
    ) {
      continue;
    }
    if (active) {
      continue;
    }

    const row = rowByCapabilityId.get(capabilityId);
    if (row?.grant_source === "manual") {
      continue;
    }

    upsertCapabilityIds.push(capabilityId);
  }

  return { revokeGrantIds, upsertCapabilityIds };
}

/** ON CONFLICT DO UPDATE runs only when the existing row is not a manual grant. */
export const roleTemplateGrantConflictUpdateWhere = ne(
  user_capabilities.grant_source,
  "manual",
);

type UserCapabilitiesTx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

/**
 * Synchronizes persisted `user_capabilities` to the desired role-template snapshot.
 */
/**
 * Soft-revokes all active `role_template` grants scoped to `roleId` for the user.
 * Used when detaching a role template association.
 */
export async function revokeRoleTemplateCapabilitySnapshot(
  tx: UserCapabilitiesTx,
  tenantId: string,
  input: {
    userId: string;
    roleId: string;
    actorId: string | null;
  },
): Promise<void> {
  await syncRoleTemplateCapabilitySnapshot(tx, tenantId, {
    ...input,
    capabilityIds: [],
  });
}

export async function syncRoleTemplateCapabilitySnapshot(
  tx: UserCapabilitiesTx,
  tenantId: string,
  input: {
    userId: string;
    roleId: string;
    capabilityIds: string[];
    actorId: string | null;
  },
): Promise<void> {
  const desiredCapabilityIds = [...new Set(input.capabilityIds)];

  const grantRows = await tx
    .select({
      id: user_capabilities.id,
      capability_id: user_capabilities.capability_id,
      grant_source: user_capabilities.grant_source,
      source_role_id: user_capabilities.source_role_id,
      revoked_at: user_capabilities.revoked_at,
    })
    .from(user_capabilities)
    .where(
      and(
        eq(user_capabilities.iq_tenant_id, tenantId),
        eq(user_capabilities.user_id, input.userId),
      ),
    );

  const plan = planRoleTemplateCapabilitySync(
    desiredCapabilityIds,
    grantRows,
    input.roleId,
  );

  if (plan.revokeGrantIds.length > 0) {
    await tx
      .update(user_capabilities)
      .set({
        revoked_at: new Date(),
        revoked_by_user_id: input.actorId,
      })
      .where(
        and(
          eq(user_capabilities.iq_tenant_id, tenantId),
          inArray(user_capabilities.id, plan.revokeGrantIds),
        ),
      );
  }

  if (plan.upsertCapabilityIds.length === 0) {
    return;
  }

  const grantedAt = new Date();
  await tx
    .insert(user_capabilities)
    .values(
      plan.upsertCapabilityIds.map((capabilityId) => ({
        iq_tenant_id: tenantId,
        user_id: input.userId,
        capability_id: capabilityId,
        grant_source: "role_template" as const,
        source_role_id: input.roleId,
        granted_by_user_id: input.actorId,
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
        granted_by_user_id: input.actorId,
        granted_at: grantedAt,
        revoked_at: null,
        revoked_by_user_id: null,
      },
      where: roleTemplateGrantConflictUpdateWhere,
    });
}

export type InMemoryCapabilityGrantLike = {
  id: string;
  user_id: string;
  capability_id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description: string | null;
  grant_source: string;
  source_role_id: string | null;
  granted_by_user_id: string | null;
  granted_at: string;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
};

/**
 * Applies a sync plan to an in-memory capability grant map (mirrors Drizzle semantics).
 */
export function applyRoleTemplateCapabilitySyncToGrantMap<T extends InMemoryCapabilityGrantLike>(
  grants: Map<string, T>,
  plan: RoleTemplateCapabilitySyncPlan,
  input: {
    userId: string;
    roleId: string;
    actorId: string | null;
    createGrant: (capabilityId: string, existing: T | undefined, grantedAt: string) => T;
  },
): void {
  const grantedAt = new Date().toISOString();
  const grantsById = new Map([...grants.values()].map((grant) => [grant.id, grant]));

  for (const grantId of plan.revokeGrantIds) {
    const grant = grantsById.get(grantId);
    if (grant && grant.revoked_at === null) {
      grant.revoked_at = grantedAt;
      grant.revoked_by_user_id = input.actorId;
    }
  }

  for (const capabilityId of plan.upsertCapabilityIds) {
    grants.set(
      capabilityId,
      input.createGrant(capabilityId, grants.get(capabilityId), grantedAt),
    );
  }
}
