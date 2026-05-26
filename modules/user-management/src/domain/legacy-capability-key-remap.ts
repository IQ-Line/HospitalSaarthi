import {
  normalizeCapabilityKey,
  parseCapabilityKey,
  type RuntimeCapabilityRowShape,
} from "./capability-key.js";

/**
 * Maps abbreviated pre–Master Data sync keys to catalog-slug runtime keys.
 * Used when rebuilding principals and when migrating `user_capabilities` snapshots.
 */
export const LEGACY_TO_CANONICAL_CAPABILITY_KEY: Readonly<Record<string, string>> = {
  // L1 `user-management` product permissions (pre–L2 junction sync)
  "user-management:user:create": "users:users:create",
  "user-management:user:read": "users:users:read",
  "user-management:user:update": "users:users:update",
  "user-management:user:delete": "users:users:delete",
  "user-management:role:create": "user-roles:user-roles:create",
  "user-management:role:read": "user-roles:user-roles:read",
  "user-management:role:update": "user-roles:user-roles:update",
  "user-management:role:delete": "user-roles:user-roles:delete",
  "user-management:role:assign": "user-roles:role:assign",
  "user-management:capability:read": "user-capabilities:user-capabilities:read",
  // User Management (`um:` → L2 module slugs)
  "um:user:create": "users:users:create",
  "um:user:read": "users:users:read",
  "um:user:update": "users:users:update",
  "um:user:delete": "users:users:delete",
  "um:user:deactivate": "users:users:delete",
  "um:role:create": "user-roles:user-roles:create",
  "um:role:read": "user-roles:user-roles:read",
  "um:role:update": "user-roles:user-roles:update",
  "um:role:delete": "user-roles:user-roles:delete",
  "um:role:assign": "user-roles:role:assign",
  "um:capability:read": "user-capabilities:user-capabilities:read",
  // Shell access
  "md:shell:access": "master-data:shell:access",
  "cfg:shell:access": "configurator:shell:access",
  "fd:shell:access": "frontdesk:shell:access",
  // Visitpad (legacy `md:` namespace)
  "md:visitpad:view": "visitpad-master:visitpad:view",
  "md:visitpad:create": "visitpad-master:visitpad:create",
  "md:visitpad:update": "visitpad-master:visitpad:create",
  "md:visitpad:delete": "visitpad-master:visitpad:create",
  "md:catalog:read": "visitpad-master:visitpad:view",
  "md:catalog:update": "visitpad-master:visitpad:create",
  "md:catalog:delete": "visitpad-master:visitpad:create",
  "visitpad-templates:visitpad:view": "visitpad-master:visitpad:view",
  "visitpad-templates:visitpad:create": "visitpad-master:visitpad:create",
  "visitpad-templates:catalog:read": "visitpad-master:visitpad:view",
  "visitpad-templates:catalog:update": "visitpad-master:visitpad:create",
  "visitpad-templates:catalog:delete": "visitpad-master:visitpad:create",
  "visitpad-templates:catalog:manage": "visitpad-master:visitpad:create",
};

/** Resolve a stored or JWT capability key to the canonical catalog-slug runtime key. */
export function canonicalizeRuntimeCapabilityKey(raw: string): string {
  const normalized = normalizeCapabilityKey(raw);
  return LEGACY_TO_CANONICAL_CAPABILITY_KEY[normalized] ?? normalized;
}

/** Deduplicated, sorted canonical keys for Cerbos and GET /auth/principal. */
export function canonicalizeRuntimeCapabilityKeys(keys: readonly string[]): string[] {
  const set = new Set<string>();
  for (const key of keys) {
    const trimmed = key.trim();
    if (trimmed.length === 0) continue;
    set.add(canonicalizeRuntimeCapabilityKey(trimmed));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function isLegacyRuntimeCapabilityKey(raw: string): boolean {
  const normalized = normalizeCapabilityKey(raw);
  return canonicalizeRuntimeCapabilityKey(normalized) !== normalized;
}

/**
 * Projects a persisted catalog row onto canonical vocabulary for validation and API responses.
 * Legacy rows may still store `um:*` keys with `module = user-management` until sync/remap completes.
 */
export function projectCapabilityRowToCanonical<T extends RuntimeCapabilityRowShape>(
  row: T,
): T {
  const canonicalKey = canonicalizeRuntimeCapabilityKey(row.capability_key);
  if (!isLegacyRuntimeCapabilityKey(row.capability_key)) {
    return row;
  }
  const parsed = parseCapabilityKey(canonicalKey);
  return {
    ...row,
    capability_key: canonicalKey,
    module: parsed.moduleKey,
    feature: parsed.resource,
    action: parsed.action,
  };
}
