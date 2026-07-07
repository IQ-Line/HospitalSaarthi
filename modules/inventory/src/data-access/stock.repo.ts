import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { StockBatchRow, StockSummaryRow } from "../domain/stock.types.js";
import type { StockStatus } from "../domain/stock-status.js";
import { inventoryItems, inventoryLots, inventoryStock } from "../schema/tables.js";

export type StockListFilters = {
  storeId: string;
  status?: StockStatus;
  search?: string;
};

function searchPattern(search: string | undefined): string | null {
  const trimmed = search?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function statusCaseSql(alias = "agg"): string {
  return `CASE
    WHEN ${alias}.available_qty = 0 THEN 'critical'
    WHEN ${alias}.reorder_point > 0 AND ${alias}.available_qty <= ${alias}.reorder_point THEN 'low'
    ELSE 'normal'
  END`;
}

function statusOrderSql(alias = "agg"): string {
  return `CASE
    WHEN ${alias}.available_qty = 0 THEN 0
    WHEN ${alias}.reorder_point > 0 AND ${alias}.available_qty <= ${alias}.reorder_point THEN 1
    ELSE 2
  END`;
}

function readExecuteRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function aggregatedCte(tenantId: string, storeId: string, search: string | null) {
  return sql`
    SELECT
      s.item_id,
      i.item_code,
      i.name AS item_name,
      i.unit_of_measure,
      i.reorder_point,
      SUM(s.quantity)::numeric(12,3) AS available_qty,
      COUNT(*)::int AS batch_count
    FROM inventory.stock s
    INNER JOIN inventory.items i
      ON i.id = s.item_id
      AND i.iq_tenant_id = s.iq_tenant_id
      AND i.is_active = true
    WHERE s.iq_tenant_id = ${tenantId}
      AND s.inventory_store_id = ${storeId}
      AND (
        ${search}::text IS NULL
        OR i.name ILIKE ${search}
        OR i.item_code ILIKE ${search}
        OR EXISTS (
          SELECT 1
          FROM inventory.stock s2
          LEFT JOIN inventory.lots l2
            ON l2.id = s2.lot_id
            AND l2.iq_tenant_id = s2.iq_tenant_id
          WHERE s2.iq_tenant_id = s.iq_tenant_id
            AND s2.inventory_store_id = s.inventory_store_id
            AND s2.item_id = s.item_id
            AND l2.lot_number ILIKE ${search}
        )
      )
    GROUP BY
      s.item_id,
      i.item_code,
      i.name,
      i.unit_of_measure,
      i.reorder_point
  `;
}

function statusWhere(status?: StockStatus): SQL {
  if (!status) return sql`TRUE`;
  return sql.raw(`(${statusCaseSql()}) = '${status}'`);
}

export class DrizzleInventoryStockRepository {
  constructor(private readonly db: DbInstance) {}

  async countAggregated(tenantId: string, filters: StockListFilters): Promise<number> {
    const search = searchPattern(filters.search);
    const result = await this.db.execute(sql`
      WITH agg AS (${aggregatedCte(tenantId, filters.storeId, search)})
      SELECT COUNT(*)::int AS total
      FROM agg
      WHERE ${statusWhere(filters.status)}
    `);
    const rows = readExecuteRows<{ total: number }>(result);
    return rows[0]?.total ?? 0;
  }

  async listAggregated(
    tenantId: string,
    filters: StockListFilters,
    pagination: { page: number; pageSize: number },
  ): Promise<StockSummaryRow[]> {
    const search = searchPattern(filters.search);
    const offset = (pagination.page - 1) * pagination.pageSize;
    const result = await this.db.execute(sql`
      WITH agg AS (${aggregatedCte(tenantId, filters.storeId, search)})
      SELECT
        agg.item_id,
        agg.item_code,
        agg.item_name,
        agg.unit_of_measure,
        agg.reorder_point::text,
        agg.available_qty::text,
        agg.batch_count
      FROM agg
      WHERE ${statusWhere(filters.status)}
      ORDER BY ${sql.raw(statusOrderSql())}, agg.item_name ASC
      LIMIT ${pagination.pageSize}
      OFFSET ${offset}
    `);
    return readExecuteRows<StockSummaryRow>(result);
  }

  async listSummaryCounts(
    tenantId: string,
    storeId: string,
    search?: string,
  ): Promise<{ critical: number; low: number; normal: number }> {
    const searchVal = searchPattern(search);
    const result = await this.db.execute(sql`
      WITH agg AS (${aggregatedCte(tenantId, storeId, searchVal)})
      SELECT
        COUNT(*) FILTER (WHERE (${sql.raw(statusCaseSql())}) = 'critical')::int AS critical,
        COUNT(*) FILTER (WHERE (${sql.raw(statusCaseSql())}) = 'low')::int AS low,
        COUNT(*) FILTER (WHERE (${sql.raw(statusCaseSql())}) = 'normal')::int AS normal
      FROM agg
    `);
    const rows = readExecuteRows<{ critical: number; low: number; normal: number }>(result);
    return rows[0] ?? { critical: 0, low: 0, normal: 0 };
  }

  async listBatchesForStoreItem(
    tenantId: string,
    storeId: string,
    itemId: string,
  ): Promise<StockBatchRow[]> {
    const rows = await this.db
      .select({
        stockId: inventoryStock.id,
        lotId: inventoryStock.lot_id,
        quantity: inventoryStock.quantity,
        lotNumber: inventoryLots.lot_number,
        expiryDate: inventoryLots.expiry_date,
        receivedDate: inventoryLots.received_date,
      })
      .from(inventoryStock)
      .leftJoin(
        inventoryLots,
        and(
          eq(inventoryStock.lot_id, inventoryLots.id),
          eq(inventoryStock.iq_tenant_id, inventoryLots.iq_tenant_id),
        ),
      )
      .where(
        and(
          eq(inventoryStock.iq_tenant_id, tenantId),
          eq(inventoryStock.inventory_store_id, storeId),
          eq(inventoryStock.item_id, itemId),
        ),
      )
      .orderBy(asc(inventoryLots.expiry_date), asc(inventoryLots.lot_number));

    return rows.map((row) => ({
      stock_id: row.stockId,
      lot_id: row.lotId,
      lot_number: row.lotId ? row.lotNumber : null,
      expiry_date: row.expiryDate,
      received_date: row.receivedDate,
      quantity: row.quantity,
    }));
  }

  async isActiveItem(tenantId: string, itemId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.iq_tenant_id, tenantId),
          eq(inventoryItems.id, itemId),
          eq(inventoryItems.is_active, true),
        ),
      )
      .limit(1);
    return Boolean(row);
  }
}
