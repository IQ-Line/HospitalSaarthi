import { normalizeCapabilityKey } from "./capability-key.js";

/**
 * Returns stored capability keys that are also in the tenant entitlement set.
 * Keys are normalized before membership check; output is deduplicated and sorted.
 */
export function intersectCapabilityKeys(
  storedKeys: readonly string[],
  entitledKeys: ReadonlySet<string>,
): string[] {
  const entitledCanonical = new Set<string>();
  for (const key of entitledKeys) {
    const trimmed = key.trim();
    if (trimmed.length === 0) continue;
    entitledCanonical.add(normalizeCapabilityKey(trimmed));
  }

  const effective = new Set<string>();
  for (const key of storedKeys) {
    const trimmed = key.trim();
    if (trimmed.length === 0) continue;
    const canonical = normalizeCapabilityKey(trimmed);
    if (entitledCanonical.has(canonical)) {
      effective.add(canonical);
    }
  }

  return [...effective].sort((a, b) => a.localeCompare(b));
}
