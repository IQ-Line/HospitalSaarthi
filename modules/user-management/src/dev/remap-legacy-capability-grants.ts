import { and, eq, inArray } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  canonicalizeRuntimeCapabilityKey,
  LEGACY_TO_CANONICAL_CAPABILITY_KEY,
} from "../domain/legacy-capability-key-remap.js";
import {
  capabilities,
  role_capabilities,
  user_capabilities,
} from "../schema/tables.js";

export type RemapLegacyCapabilityGrantsOptions = {
  dryRun?: boolean;
};

export type RemapLegacyCapabilityGrantsResult = {
  dryRun: boolean;
  legacyKeysSeen: string[];
  remappedUserGrants: number;
  remappedRoleGrants: number;
  skippedMissingCanonical: string[];
};

type CapabilityRow = { id: string; capability_key: string };

async function loadCapabilitiesByKey(
  db: DbInstance,
  keys: string[],
): Promise<Map<string, CapabilityRow>> {
  if (keys.length === 0) return new Map();
  const rows = await db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(inArray(capabilities.capability_key, keys));
  return new Map(rows.map((row) => [row.capability_key, row]));
}

export async function remapLegacyCapabilityGrants(
  db: DbInstance,
  options: RemapLegacyCapabilityGrantsOptions = {},
): Promise<RemapLegacyCapabilityGrantsResult> {
  const dryRun = options.dryRun ?? false;

  const legacyRows = await db
    .select({ id: capabilities.id, capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(eq(capabilities.is_active, true));

  const legacyCaps = legacyRows.filter((row) => {
    const key = row.capability_key.trim().toLowerCase();
    return canonicalizeRuntimeCapabilityKey(key) !== key;
  });
  if (legacyCaps.length === 0) {
    return {
      dryRun,
      legacyKeysSeen: [],
      remappedUserGrants: 0,
      remappedRoleGrants: 0,
      skippedMissingCanonical: [],
    };
  }

  const legacyKeysSeen = legacyCaps.map((row) => row.capability_key);
  const canonicalKeys = [
    ...new Set(
      legacyCaps.map((row) =>
        canonicalizeRuntimeCapabilityKey(row.capability_key),
      ),
    ),
  ];
  const canonicalByKey = await loadCapabilitiesByKey(db, canonicalKeys);
  const skippedMissingCanonical = canonicalKeys.filter((key) => !canonicalByKey.has(key));

  const legacyIdToCanonicalId = new Map<string, string>();
  for (const legacy of legacyCaps) {
    const canonicalKey = canonicalizeRuntimeCapabilityKey(legacy.capability_key);
    const canonical = canonicalByKey.get(canonicalKey);
    if (canonical) {
      legacyIdToCanonicalId.set(legacy.id, canonical.id);
    }
  }

  if (legacyIdToCanonicalId.size === 0) {
    return {
      dryRun,
      legacyKeysSeen,
      remappedUserGrants: 0,
      remappedRoleGrants: 0,
      skippedMissingCanonical,
    };
  }

  const legacyIds = [...legacyIdToCanonicalId.keys()];

  const userGrantRows = await db
    .select({
      iq_tenant_id: user_capabilities.iq_tenant_id,
      user_id: user_capabilities.user_id,
      capability_id: user_capabilities.capability_id,
      grant_source: user_capabilities.grant_source,
      source_role_id: user_capabilities.source_role_id,
      granted_by_user_id: user_capabilities.granted_by_user_id,
      granted_at: user_capabilities.granted_at,
    })
    .from(user_capabilities)
    .where(inArray(user_capabilities.capability_id, legacyIds));

  const roleGrantRows = await db
    .select({
      iq_tenant_id: role_capabilities.iq_tenant_id,
      role_id: role_capabilities.role_id,
      capability_id: role_capabilities.capability_id,
    })
    .from(role_capabilities)
    .where(inArray(role_capabilities.capability_id, legacyIds));

  if (dryRun) {
    return {
      dryRun: true,
      legacyKeysSeen,
      remappedUserGrants: userGrantRows.length,
      remappedRoleGrants: roleGrantRows.length,
      skippedMissingCanonical,
    };
  }

  let remappedUserGrants = 0;
  let remappedRoleGrants = 0;

  await db.transaction(async (tx) => {
    for (const grant of userGrantRows) {
      const canonicalId = legacyIdToCanonicalId.get(grant.capability_id);
      if (!canonicalId) continue;

      await tx
        .insert(user_capabilities)
        .values({
          iq_tenant_id: grant.iq_tenant_id,
          user_id: grant.user_id,
          capability_id: canonicalId,
          grant_source: grant.grant_source,
          source_role_id: grant.source_role_id,
          granted_by_user_id: grant.granted_by_user_id,
          granted_at: grant.granted_at,
          revoked_at: null,
          revoked_by_user_id: null,
        })
        .onConflictDoUpdate({
          target: [
            user_capabilities.iq_tenant_id,
            user_capabilities.user_id,
            user_capabilities.capability_id,
          ],
          set: {
            grant_source: grant.grant_source,
            source_role_id: grant.source_role_id,
            granted_at: grant.granted_at,
            revoked_at: null,
            revoked_by_user_id: null,
          },
        });

      await tx.delete(user_capabilities).where(
        and(
          eq(user_capabilities.iq_tenant_id, grant.iq_tenant_id),
          eq(user_capabilities.user_id, grant.user_id),
          eq(user_capabilities.capability_id, grant.capability_id),
        ),
      );
      remappedUserGrants += 1;
    }

    for (const grant of roleGrantRows) {
      const canonicalId = legacyIdToCanonicalId.get(grant.capability_id);
      if (!canonicalId) continue;

      await tx
        .insert(role_capabilities)
        .values({
          iq_tenant_id: grant.iq_tenant_id,
          role_id: grant.role_id,
          capability_id: canonicalId,
        })
        .onConflictDoNothing({
          target: [
            role_capabilities.iq_tenant_id,
            role_capabilities.role_id,
            role_capabilities.capability_id,
          ],
        });

      await tx.delete(role_capabilities).where(
        and(
          eq(role_capabilities.iq_tenant_id, grant.iq_tenant_id),
          eq(role_capabilities.role_id, grant.role_id),
          eq(role_capabilities.capability_id, grant.capability_id),
        ),
      );
      remappedRoleGrants += 1;
    }
  });

  return {
    dryRun,
    legacyKeysSeen,
    remappedUserGrants,
    remappedRoleGrants,
    skippedMissingCanonical,
  };
}

/** Keys that would be remapped (for diagnostics). */
export function listLegacyCapabilityKeyTargets(): string[] {
  return Object.entries(LEGACY_TO_CANONICAL_CAPABILITY_KEY).map(
    ([legacy, canonical]) => `${legacy} → ${canonical}`,
  );
}
