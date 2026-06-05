/** Canonical UUID v4 validation used across user-management route and domain inputs. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function assertUuid(value: string, label = "id"): string {
  const normalized = value.trim();
  if (!isUuid(normalized)) {
    throw new Error(`${label} must be a UUID string`);
  }
  return normalized;
}
