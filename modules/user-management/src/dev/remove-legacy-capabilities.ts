import { inArray, like, or, sql } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  capabilities,
  delegated_capability_grants,
  role_capabilities,
  user_capabilities,
} from "../schema/tables.js";
import {
  isLegacyCapabilityKey,
  LEGACY_CAPABILITY_KEY_PREFIXES,
} from "./legacy-capability-key-prefixes.js";

export type RemoveLegacyCapabilitiesOptions = {
  /** Defaults to {@link LEGACY_CAPABILITY_KEY_PREFIXES} (`um:`, `md:`, `cfg:`, `fd:`). */
  prefixes?: readonly string[];
  /** When true, only reports rows that would be removed. */
  dryRun?: boolean;
};

export type RemoveLegacyCapabilitiesResult = {
  dryRun: boolean;
  matchedCapabilityKeys: string[];
  deletedDelegatedGrants: number;
  deletedUserCapabilities: number;
  deletedRoleCapabilities: number;
  deletedCapabilities: number;
};

function legacyKeyWhereClause(prefixes: readonly string[]) {
  return or(
    ...prefixes.map((prefix) =>
      like(capabilities.capability_key, `${prefix.toLowerCase()}%`),
    ),
  )!;
}

export async function removeLegacyCapabilitiesFromCatalog(
  db: DbInstance,
  options: RemoveLegacyCapabilitiesOptions = {},
): Promise<RemoveLegacyCapabilitiesResult> {
  const prefixes = options.prefixes ?? LEGACY_CAPABILITY_KEY_PREFIXES;
  const dryRun = options.dryRun ?? false;

  const matched = await db
    .select({
      id: capabilities.id,
      capability_key: capabilities.capability_key,
    })
    .from(capabilities)
    .where(legacyKeyWhereClause(prefixes));

  const capabilityIds = matched.map((row) => row.id);
  const matchedCapabilityKeys = matched.map((row) => row.capability_key);

  if (capabilityIds.length === 0) {
    return {
      dryRun,
      matchedCapabilityKeys: [],
      deletedDelegatedGrants: 0,
      deletedUserCapabilities: 0,
      deletedRoleCapabilities: 0,
      deletedCapabilities: 0,
    };
  }

  const countGrants = async () => {
    const [delegated] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(delegated_capability_grants)
      .where(inArray(delegated_capability_grants.capability_id, capabilityIds));
    const [userCaps] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user_capabilities)
      .where(inArray(user_capabilities.capability_id, capabilityIds));
    const [roleCaps] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(role_capabilities)
      .where(inArray(role_capabilities.capability_id, capabilityIds));

    return {
      delegated: delegated?.count ?? 0,
      user: userCaps?.count ?? 0,
      role: roleCaps?.count ?? 0,
    };
  };

  if (dryRun) {
    const counts = await countGrants();
    return {
      dryRun: true,
      matchedCapabilityKeys,
      deletedDelegatedGrants: counts.delegated,
      deletedUserCapabilities: counts.user,
      deletedRoleCapabilities: counts.role,
      deletedCapabilities: capabilityIds.length,
    };
  }

  return db.transaction(async (tx) => {
    const deletedDelegated = await tx
      .delete(delegated_capability_grants)
      .where(inArray(delegated_capability_grants.capability_id, capabilityIds))
      .returning({ id: delegated_capability_grants.id });

    const deletedUser = await tx
      .delete(user_capabilities)
      .where(inArray(user_capabilities.capability_id, capabilityIds))
      .returning({ id: user_capabilities.id });

    const deletedRole = await tx
      .delete(role_capabilities)
      .where(inArray(role_capabilities.capability_id, capabilityIds))
      .returning({ id: role_capabilities.id });

    const deletedCaps = await tx
      .delete(capabilities)
      .where(inArray(capabilities.id, capabilityIds))
      .returning({ id: capabilities.id });

    return {
      dryRun: false,
      matchedCapabilityKeys,
      deletedDelegatedGrants: deletedDelegated.length,
      deletedUserCapabilities: deletedUser.length,
      deletedRoleCapabilities: deletedRole.length,
      deletedCapabilities: deletedCaps.length,
    };
  });
}

/** Lists legacy keys still present (for diagnostics). */
export async function listLegacyCapabilityKeys(
  db: DbInstance,
  prefixes: readonly string[] = LEGACY_CAPABILITY_KEY_PREFIXES,
): Promise<string[]> {
  const rows = await db
    .select({ capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(legacyKeyWhereClause(prefixes));

  return rows
    .map((row) => row.capability_key)
    .filter((key) => isLegacyCapabilityKey(key, prefixes))
    .sort();
}
