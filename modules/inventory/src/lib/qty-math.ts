/** Matches inventory numeric(12, 3) precision — use for qty comparisons. */
export const QTY_EPSILON = 0.0005;

export function qtyNearlyEqual(a: number, b: number, epsilon = QTY_EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function qtyGreaterThan(a: number, b: number, epsilon = QTY_EPSILON): boolean {
  return a - b > epsilon;
}

export function qtyLessThan(a: number, b: number, epsilon = QTY_EPSILON): boolean {
  return b - a > epsilon;
}

export function assertQtySum(
  parts: number[],
  total: number,
  message: string,
  epsilon = QTY_EPSILON,
): void {
  const sum = parts.reduce((acc, value) => acc + value, 0);
  if (!qtyNearlyEqual(sum, total, epsilon)) {
    throw new Error(message);
  }
}
