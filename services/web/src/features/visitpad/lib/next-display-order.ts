/** Rows that expose a numeric display_order for catalog sorting. */
export type DisplayOrderRow = { display_order?: number | null };

/** Next display_order for a new catalog row (max existing + 1). */
export function nextDisplayOrder(rows: readonly DisplayOrderRow[]): number {
  if (rows.length === 0) return 1;
  const max = Math.max(0, ...rows.map((r) => r.display_order ?? 0));
  return max + 1;
}
