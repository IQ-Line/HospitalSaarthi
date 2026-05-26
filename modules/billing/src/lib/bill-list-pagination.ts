import type { BillRow } from "../domain/bill.types.js";

export type BillListCursor = { created_at: string; id: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function clampBillListLimit(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_LIMIT);
}

export function decodeBillListCursor(raw: string | undefined): BillListCursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as BillListCursor;
    return typeof c.created_at === "string" && typeof c.id === "string" ? c : null;
  } catch {
    return null;
  }
}

export function encodeBillListCursor(row: Pick<BillRow, "created_at" | "id">): string {
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row.id })).toString(
    "base64url",
  );
}

export function billListCursorCompare(
  row: Pick<BillRow, "created_at" | "id">,
  cursor: BillListCursor,
): boolean {
  return (
    row.created_at < cursor.created_at ||
    (row.created_at === cursor.created_at && row.id < cursor.id)
  );
}
