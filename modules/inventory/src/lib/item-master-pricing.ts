import type { InventoryItemRow } from "../data-access/items.repo.js";

export type ItemMasterPricingSnapshot = {
  item_id: string;
  item_code: string;
  mrp: string;
  gst_percent: string;
};

type HsnSelectionLike = {
  cgst_pct?: unknown;
  sgst_pct?: unknown;
  igst_pct?: number | string;
};

function readNonNegativeNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function formatPricingDecimal(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Combined GST rate for billing — CGST+SGST when present, else IGST. */
export function gstPercentFromSupplyAttributes(
  supplyAttributes: Record<string, unknown> | null | undefined,
): string {
  const selections =
    supplyAttributes?.hsnSelections ?? supplyAttributes?.hsn_selections;
  if (!Array.isArray(selections) || selections.length === 0) return "0";

  const primary = selections[0] as HsnSelectionLike;
  const cgst =
    readNonNegativeNumber(primary.cgst_pct) ??
    readNonNegativeNumber((primary as { cgst_percent?: unknown }).cgst_percent) ??
    0;
  const sgst =
    readNonNegativeNumber(primary.sgst_pct) ??
    readNonNegativeNumber((primary as { sgst_percent?: unknown }).sgst_percent) ??
    0;
  const igst =
    readNonNegativeNumber(primary.igst_pct) ??
    readNonNegativeNumber((primary as { igst_percent?: unknown }).igst_percent) ??
    0;
  const intraState = cgst + sgst;
  if (intraState > 0) return formatPricingDecimal(intraState);
  if (igst > 0) return formatPricingDecimal(igst);
  return "0";
}

export function mrpFromSupplyAttributes(
  supplyAttributes: Record<string, unknown> | null | undefined,
): string | null {
  const topLevelMrp = readNonNegativeNumber(supplyAttributes?.mrp);
  if (topLevelMrp != null) return formatPricingDecimal(topLevelMrp);

  const pharmacy = supplyAttributes?.pharmacy;
  if (pharmacy == null || typeof pharmacy !== "object") return null;
  const mrp = readNonNegativeNumber((pharmacy as { mrp?: unknown }).mrp);
  if (mrp == null) return null;
  return formatPricingDecimal(mrp);
}

export function extractItemMasterPricing(
  row: Pick<InventoryItemRow, "id" | "item_code" | "supply_attributes">,
): ItemMasterPricingSnapshot {
  const supply =
    row.supply_attributes != null && typeof row.supply_attributes === "object"
      ? (row.supply_attributes as Record<string, unknown>)
      : {};

  return {
    item_id: row.id,
    item_code: row.item_code,
    mrp: mrpFromSupplyAttributes(supply) ?? "0",
    gst_percent: gstPercentFromSupplyAttributes(supply),
  };
}
