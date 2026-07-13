/** Short human-readable token from a dispense record id (e.g. A1B2C3D4). */
export function formatDispenseNumber(dispenseId: string): string {
  const compact = dispenseId.replace(/-/g, "").toUpperCase();
  return compact.slice(0, 8);
}

/** Generates a tenant-scoped return number: PH-RT-YYYYMMDD-0001. */
export function formatReturnNumber(processedAt: Date, dailySequence: number): string {
  const y = processedAt.getUTCFullYear();
  const m = String(processedAt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(processedAt.getUTCDate()).padStart(2, "0");
  const seq = String(dailySequence).padStart(4, "0");
  return `PH-RT-${y}${m}${d}-${seq}`;
}
