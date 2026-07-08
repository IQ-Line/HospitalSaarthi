/**
 * Extracts runtime capability keys from `GET /auth/principal` attributes.
 */
export function normalizeCapabilityKey(key: string): string {
  return key.trim().toLowerCase();
}

export function capabilityKeysFromPrincipalAttributes(
  attributes: Record<string, unknown> | undefined,
): readonly string[] {
  const keys = new Set<string>();
  if (!attributes) {
    return [];
  }

  for (const field of ['capabilities', 'delegated_capabilities'] as const) {
    const value = attributes[field];
    if (!Array.isArray(value)) {
      continue;
    }
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) {
        keys.add(normalizeCapabilityKey(entry));
      }
    }
  }

  return [...keys].sort((a, b) => a.localeCompare(b));
}
