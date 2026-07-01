export type StockStatus = "normal" | "low" | "critical";

export type BatchExpiryStatus = "expired" | "expiring_soon" | null;

export const DEFAULT_EXPIRY_ALERT_DAYS = 14;

export function computeStockStatus(availableQty: number, reorderPoint: number): StockStatus {
  if (availableQty <= 0) return "critical";
  if (reorderPoint > 0 && availableQty <= reorderPoint) return "low";
  return "normal";
}

export function computeBatchExpiryStatus(
  expiryDate: string | null,
  expiryAlertDays: number = DEFAULT_EXPIRY_ALERT_DAYS,
  today = new Date().toISOString().slice(0, 10),
): BatchExpiryStatus {
  if (!expiryDate) return null;
  if (expiryDate < today) return "expired";
  const daysLeft = Math.ceil(
    (new Date(expiryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft >= 0 && daysLeft <= expiryAlertDays) return "expiring_soon";
  return null;
}

export function toQtyNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
