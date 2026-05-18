/**
 * Rewrite `Reference.reference` strings of the form `ResourceType/id` to
 * `urn:uuid:…` when `id` matches a bundle entry (ADR-0023 self-contained bundle).
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Collect `Type/id` → `urn:uuid:…` for resources that declare both. */
export function buildReferenceMap(
  resources: { resourceType: string; id?: string }[],
  fullUrls: string[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    const fullUrl = fullUrls[i];
    if (!r?.id || !fullUrl?.startsWith("urn:uuid:")) continue;
    const key = `${r.resourceType}/${r.id}`;
    map.set(key, fullUrl);
  }
  return map;
}

export function rewriteReferencesInPlace(value: unknown, refMap: Map<string, string>): void {
  if (value === null || typeof value === "undefined") return;
  if (Array.isArray(value)) {
    for (const item of value) rewriteReferencesInPlace(item, refMap);
    return;
  }
  if (!isPlainObject(value)) return;

  if (typeof value.reference === "string") {
    const mapped = refMap.get(value.reference);
    if (mapped) {
      value.reference = mapped;
    }
  }

  for (const k of Object.keys(value)) {
    rewriteReferencesInPlace(value[k], refMap);
  }
}
