/** Active / total pair for primary tab label, aligned with reference UI (e.g. Vitals (8/15)). */
export function visitpadActiveTotal<T extends { is_active: boolean }>(
  rows: T[],
  totalFromApi: number | undefined,
): { active: number; total: number } {
  const active = rows.filter((r) => r.is_active).length;
  const total = totalFromApi ?? rows.length;
  return { active, total };
}
