/**
 * Abbreviated runtime key prefixes from the pre–Master Data sync era.
 * Current keys use catalog `modules.slug` verbatim (e.g. `users:users:read`).
 */
export const LEGACY_CAPABILITY_KEY_PREFIXES = ["um:", "md:", "cfg:", "fd:"] as const;

export type LegacyCapabilityKeyPrefix = (typeof LEGACY_CAPABILITY_KEY_PREFIXES)[number];

export function isLegacyCapabilityKey(
  capabilityKey: string,
  prefixes: readonly string[] = LEGACY_CAPABILITY_KEY_PREFIXES,
): boolean {
  const normalized = capabilityKey.trim().toLowerCase();
  return prefixes.some((prefix) => normalized.startsWith(prefix.toLowerCase()));
}
