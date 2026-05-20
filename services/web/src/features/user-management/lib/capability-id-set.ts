/** Stable key for comparing capability id lists in effects (order-independent). */
export function capabilityIdsSignature(ids: readonly string[]): string {
  if (ids.length === 0) return '';
  return [...ids].sort().join('\0');
}

export function areCapabilityIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  return capabilityIdsSignature(a) === capabilityIdsSignature(b);
}
