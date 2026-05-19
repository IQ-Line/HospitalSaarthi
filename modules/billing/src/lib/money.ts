/** Decimal money as string (NUMERIC 18,4). Avoid JS float for arithmetic. */

export function money(n: number | string): string {
  return Number(n).toFixed(4);
}

export function moneyAdd(a: string, b: string): string {
  return money(Number(a) + Number(b));
}

export function moneySub(a: string, b: string): string {
  return money(Number(a) - Number(b));
}

export function moneyMul(price: string, qty: number): string {
  return money(Number(price) * qty);
}

export function moneyTax(net: string, ratePct: string): string {
  return money((Number(net) * Number(ratePct)) / 100);
}

export function moneyGte(a: string, b: string): boolean {
  return Number(a) >= Number(b);
}

export function moneyGt(a: string, b: string): boolean {
  return Number(a) > Number(b);
}
