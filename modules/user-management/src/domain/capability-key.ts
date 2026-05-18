import { InvalidCapabilityKeyError } from "./errors.js";
import { assertValidModuleSlug, normalizeModuleSlug } from "./module-slug.js";

/**
 * Runtime capability key: `<moduleKey>:<resource>:<action>` (lowercase, colon-separated).
 * `moduleKey` is the Cerbos/PDP namespace prefix; it may differ from `capabilities.module`
 * (Master Data catalog slug) — see {@link runtimeModuleKeyForCatalogSlug}.
 */
export const CAPABILITY_KEY_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RUNTIME_CAPABILITY_KEY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Canonical actions for the third segment of runtime capability keys. */
export const RUNTIME_CAPABILITY_ACTIONS = [
  "assign",
  "compose",
  "create",
  "deactivate",
  "delete",
  "manage",
  "read",
  "update",
  "view",
] as const;

export type RuntimeCapabilityAction = (typeof RUNTIME_CAPABILITY_ACTIONS)[number];

const RUNTIME_CAPABILITY_ACTION_SET = new Set<string>(RUNTIME_CAPABILITY_ACTIONS);

/**
 * Runtime module key prefix when it differs from the Master Data `modules.slug`.
 * All other catalog slugs default to using the slug itself as the runtime module key.
 */
export const RUNTIME_MODULE_KEY_BY_CATALOG_SLUG: Readonly<Record<string, string>> = {
  "user-management": "um",
};

/** Reserved runtime module keys (documentation / collision avoidance). */
export const RESERVED_RUNTIME_MODULE_KEYS = ["md", "um"] as const;

export type ParsedCapabilityKey = {
  readonly moduleKey: string;
  readonly resource: string;
  readonly action: string;
  readonly raw: string;
};

export function normalizeCapabilityKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function runtimeModuleKeyForCatalogSlug(catalogModuleSlug: string): string {
  const slug = assertValidModuleSlug(catalogModuleSlug, "capabilities.module");
  return RUNTIME_MODULE_KEY_BY_CATALOG_SLUG[slug] ?? slug;
}

export function catalogSlugForRuntimeModuleKey(moduleKey: string): string | null {
  const normalizedKey = normalizeModuleSlug(moduleKey);
  for (const [slug, key] of Object.entries(RUNTIME_MODULE_KEY_BY_CATALOG_SLUG)) {
    if (key === normalizedKey) {
      return slug;
    }
  }
  return isValidRuntimeModuleKeyAsCatalogSlug(normalizedKey) ? normalizedKey : null;
}

function isValidRuntimeModuleKeyAsCatalogSlug(moduleKey: string): boolean {
  try {
    assertValidModuleSlug(moduleKey, "runtime module key");
    return true;
  } catch {
    return false;
  }
}

export function parseCapabilityKey(raw: string): ParsedCapabilityKey {
  const normalized = normalizeCapabilityKey(raw);
  if (!RUNTIME_CAPABILITY_KEY_PATTERN.test(normalized)) {
    throw new InvalidCapabilityKeyError(
      "capability_key must match <module>:<resource>:<action> (lowercase, colon-separated)",
    );
  }

  const segments = normalized.split(":");
  const [moduleKey, resource, action] = segments as [string, string, string];
  for (const [label, segment] of [
    ["module", moduleKey],
    ["resource", resource],
    ["action", action],
  ] as const) {
    if (!CAPABILITY_KEY_SEGMENT_PATTERN.test(segment)) {
      throw new InvalidCapabilityKeyError(`capability_key ${label} segment is invalid: ${segment}`);
    }
  }

  if (!RUNTIME_CAPABILITY_ACTION_SET.has(action)) {
    throw new InvalidCapabilityKeyError(
      `capability_key action segment "${action}" is not a recognized runtime action`,
    );
  }

  return { moduleKey, resource, action, raw: normalized };
}

export function assertValidCapabilityKey(raw: string, label = "capability_key"): string {
  parseCapabilityKey(raw);
  return normalizeCapabilityKey(raw);
}

export function assertCapabilityKeyMatchesCatalogModule(
  capabilityKey: string,
  catalogModuleSlug: string,
  label = "capability",
): void {
  const parsed = parseCapabilityKey(capabilityKey);
  const expectedModuleKey = runtimeModuleKeyForCatalogSlug(catalogModuleSlug);
  if (parsed.moduleKey !== expectedModuleKey) {
    throw new InvalidCapabilityKeyError(
      `${label}: capability_key module segment "${parsed.moduleKey}" does not match catalog module "${normalizeModuleSlug(catalogModuleSlug)}" (expected runtime key "${expectedModuleKey}")`,
    );
  }
}

export type RuntimeCapabilityRowShape = {
  capability_key: string;
  module: string;
  feature: string;
  action: string;
};

/**
 * Validates a persisted runtime capability row (fail-closed for catalog integrity).
 * Does not require `feature`/`action` columns to match key segments (legacy UM rows use plural features).
 */
export function assertValidRuntimeCapabilityRow(
  row: RuntimeCapabilityRowShape,
  label = "capability",
): void {
  const key = assertValidCapabilityKey(row.capability_key, `${label}.capability_key`);
  assertCapabilityKeyMatchesCatalogModule(key, row.module, label);
  assertValidModuleSlug(row.module, `${label}.module`);

  const parsed = parseCapabilityKey(key);
  const actionNorm = row.action.trim().toLowerCase();
  if (actionNorm !== parsed.action) {
    throw new InvalidCapabilityKeyError(
      `${label}: capabilities.action "${row.action}" does not match capability_key action segment "${parsed.action}"`,
    );
  }
}

export function findDuplicateCapabilityKeys(
  capabilities: ReadonlyArray<{ capability_key: string }>,
): string[] {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const capability of capabilities) {
    const normalized = normalizeCapabilityKey(capability.capability_key);
    const prior = seen.get(normalized);
    if (prior !== undefined && prior !== capability.capability_key) {
      duplicates.push(normalized);
    } else {
      seen.set(normalized, capability.capability_key);
    }
  }
  return [...new Set(duplicates)];
}
