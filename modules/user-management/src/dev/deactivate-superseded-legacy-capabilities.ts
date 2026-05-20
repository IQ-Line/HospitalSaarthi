import { and, eq, inArray } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  canonicalizeRuntimeCapabilityKey,
  isLegacyRuntimeCapabilityKey,
} from "../domain/legacy-capability-key-remap.js";
import { capabilities } from "../schema/tables.js";

export type DeactivateSupersededLegacyCapabilitiesResult = {
  deactivated: number;
  deactivatedKeys: string[];
};

/**
 * Deactivates active legacy catalog rows when a canonical `capability_key` twin exists.
 * Safe to run on every startup after MD sync.
 */
export async function deactivateSupersededLegacyCapabilities(
  db: DbInstance,
): Promise<DeactivateSupersededLegacyCapabilitiesResult> {
  const activeRows = await db
    .select({
      id: capabilities.id,
      capability_key: capabilities.capability_key,
    })
    .from(capabilities)
    .where(eq(capabilities.is_active, true));

  const legacyRows = activeRows.filter((row) =>
    isLegacyRuntimeCapabilityKey(row.capability_key),
  );
  if (legacyRows.length === 0) {
    return { deactivated: 0, deactivatedKeys: [] };
  }

  const canonicalKeys = [
    ...new Set(
      legacyRows.map((row) => canonicalizeRuntimeCapabilityKey(row.capability_key)),
    ),
  ];
  const canonicalRows = await db
    .select({ capability_key: capabilities.capability_key })
    .from(capabilities)
    .where(
      and(
        eq(capabilities.is_active, true),
        inArray(capabilities.capability_key, canonicalKeys),
      ),
    );
  const activeCanonical = new Set(canonicalRows.map((row) => row.capability_key));

  const toDeactivate = legacyRows.filter((row) =>
    activeCanonical.has(canonicalizeRuntimeCapabilityKey(row.capability_key)),
  );
  if (toDeactivate.length === 0) {
    return { deactivated: 0, deactivatedKeys: [] };
  }

  const ids = toDeactivate.map((row) => row.id);
  await db
    .update(capabilities)
    .set({ is_active: false, updated_at: new Date() })
    .where(inArray(capabilities.id, ids));

  return {
    deactivated: ids.length,
    deactivatedKeys: toDeactivate.map((row) => row.capability_key),
  };
}
