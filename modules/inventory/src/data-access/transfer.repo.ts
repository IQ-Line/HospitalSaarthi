import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { toIlikeContainsPattern } from "../lib/ilike.js";
import type {
  CreateStockTransferInput,
  ListStockTransfersQuery,
  StockTransferLineRow,
  StockTransferRow,
} from "../domain/transfer.types.js";
import { TransferValidationError } from "../errors.js";
import {
  inventoryIndents,
  inventoryItems,
  inventoryStockTransferLines,
  inventoryStockTransferSequences,
  inventoryStockTransfers,
} from "../schema/tables.js";

function mapTransferRow(row: typeof inventoryStockTransfers.$inferSelect): StockTransferRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    transfer_number: row.transfer_number,
    transfer_date: row.transfer_date,
    from_store_id: row.from_store_id,
    to_store_id: row.to_store_id,
    transfer_type: row.transfer_type as StockTransferRow["transfer_type"],
    status: row.status as StockTransferRow["status"],
    remarks: row.remarks,
    inventory_indent_id: row.inventory_indent_id,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTransferLineRow(row: typeof inventoryStockTransferLines.$inferSelect): StockTransferLineRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    stock_transfer_id: row.stock_transfer_id,
    item_id: row.item_id,
    transfer_qty: row.transfer_qty,
    line_remarks: row.line_remarks,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function listFilters(tenantId: string, query: ListStockTransfersQuery): SQL[] {
  const filters: SQL[] = [eq(inventoryStockTransfers.iq_tenant_id, tenantId)];

  if (query.status) {
    filters.push(eq(inventoryStockTransfers.status, query.status));
  }

  if (query.inventory_indent_id) {
    filters.push(eq(inventoryStockTransfers.inventory_indent_id, query.inventory_indent_id));
  }

  const search = query.search?.trim();
  if (search) {
    const pattern = toIlikeContainsPattern(search);
    filters.push(
      or(
        sql`${inventoryStockTransfers.transfer_number} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${inventoryStockTransfers.status} ILIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }

  return filters;
}

function draftNumber(): string {
  return `DRAFT-TRF-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export class DrizzleInventoryTransferRepository {
  constructor(private readonly db: DbInstance) {}

  async list(
    tenantId: string,
    query: ListStockTransfersQuery,
  ): Promise<{ rows: StockTransferRow[]; total: number }> {
    const where = and(...listFilters(tenantId, query));
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [countRows, rows] = await Promise.all([
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(inventoryStockTransfers)
        .where(where),
      this.db
        .select()
        .from(inventoryStockTransfers)
        .where(where)
        .orderBy(desc(inventoryStockTransfers.transfer_date), desc(inventoryStockTransfers.created_at))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows: rows.map(mapTransferRow),
      total: countRows[0]?.total ?? 0,
    };
  }

  async findById(tenantId: string, transferId: string): Promise<StockTransferRow | undefined> {
    const [row] = await this.db
      .select()
      .from(inventoryStockTransfers)
      .where(
        and(
          eq(inventoryStockTransfers.iq_tenant_id, tenantId),
          eq(inventoryStockTransfers.id, transferId),
        ),
      )
      .limit(1);
    return row ? mapTransferRow(row) : undefined;
  }

  async listLines(tenantId: string, transferId: string): Promise<StockTransferLineRow[]> {
    const rows = await this.db
      .select()
      .from(inventoryStockTransferLines)
      .where(
        and(
          eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
          eq(inventoryStockTransferLines.stock_transfer_id, transferId),
        ),
      )
      .orderBy(asc(inventoryStockTransferLines.sort_order), asc(inventoryStockTransferLines.created_at));
    return rows.map(mapTransferLineRow);
  }

  async listLinesWithItems(tenantId: string, transferId: string) {
    const rows = await this.db
      .select({
        line: inventoryStockTransferLines,
        item: {
          id: inventoryItems.id,
          item_code: inventoryItems.item_code,
          name: inventoryItems.name,
          unit_of_measure: inventoryItems.unit_of_measure,
        },
      })
      .from(inventoryStockTransferLines)
      .leftJoin(
        inventoryItems,
        and(
          eq(inventoryStockTransferLines.iq_tenant_id, inventoryItems.iq_tenant_id),
          eq(inventoryStockTransferLines.item_id, inventoryItems.id),
        ),
      )
      .where(
        and(
          eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
          eq(inventoryStockTransferLines.stock_transfer_id, transferId),
        ),
      )
      .orderBy(asc(inventoryStockTransferLines.sort_order), asc(inventoryStockTransferLines.created_at));

    return rows.map((row) => ({
      ...mapTransferLineRow(row.line),
      item: row.item?.id
        ? {
            id: row.item.id,
            item_code: row.item.item_code,
            name: row.item.name,
            unit_of_measure: row.item.unit_of_measure,
          }
        : null,
    }));
  }

  async createDraft(
    tenantId: string,
    input: CreateStockTransferInput,
    actorId: string | null,
  ): Promise<StockTransferRow> {
    if (!input.lines.length) {
      throw new TransferValidationError("Transfer must have at least one line");
    }
    if (input.from_store_id === input.to_store_id) {
      throw new TransferValidationError("Source and destination stores must be different");
    }

    for (const line of input.lines) {
      if (!Number.isFinite(line.transfer_qty) || line.transfer_qty <= 0) {
        throw new TransferValidationError("Transfer quantity must be greater than zero");
      }
    }

    return this.db.transaction(async (tx) => {
      const [header] = await tx
        .insert(inventoryStockTransfers)
        .values({
          iq_tenant_id: tenantId,
          transfer_number: draftNumber(),
          transfer_date: input.transfer_date,
          from_store_id: input.from_store_id,
          to_store_id: input.to_store_id,
          transfer_type: input.transfer_type,
          status: "draft",
          remarks: input.remarks?.trim() || null,
          inventory_indent_id: input.inventory_indent_id ?? null,
          created_by: actorId,
        })
        .returning();

      if (!header) {
        throw new TransferValidationError("Failed to create transfer");
      }

      await tx.insert(inventoryStockTransferLines).values(
        input.lines.map((line, index) => ({
          iq_tenant_id: tenantId,
          stock_transfer_id: header.id,
          item_id: line.item_id,
          transfer_qty: String(line.transfer_qty),
          line_remarks: line.line_remarks?.trim() || null,
          sort_order: line.sort_order ?? index,
        })),
      );

      const transferNumber = await this.nextTransferNumberInTx(tx, tenantId, input.transfer_date);
      const [finalized] = await tx
        .update(inventoryStockTransfers)
        .set({
          transfer_number: transferNumber,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(inventoryStockTransfers.iq_tenant_id, tenantId),
            eq(inventoryStockTransfers.id, header.id),
          ),
        )
        .returning();

      if (input.inventory_indent_id) {
        const [linked] = await tx
          .update(inventoryIndents)
          .set({
            inventory_stock_transfer_id: header.id,
            status: "in_fulfillment",
            updated_at: new Date(),
          })
          .where(
            and(
              eq(inventoryIndents.iq_tenant_id, tenantId),
              eq(inventoryIndents.id, input.inventory_indent_id),
              inArray(inventoryIndents.status, ["approved", "partially_approved"]),
              sql`${inventoryIndents.inventory_stock_transfer_id} IS NULL`,
            ),
          )
          .returning();

        if (!linked) {
          throw new TransferValidationError("Indent is not eligible for stock transfer linking");
        }
      }

      return mapTransferRow(finalized ?? header);
    });
  }

  private async nextTransferNumberInTx(
    tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
    tenantId: string,
    transferDate: string,
  ): Promise<string> {
    const periodKey = transferDate.slice(0, 7).replace("-", "");
    const [row] = await tx
      .insert(inventoryStockTransferSequences)
      .values({
        iq_tenant_id: tenantId,
        period_key: periodKey,
        last_value: 1,
      })
      .onConflictDoUpdate({
        target: [
          inventoryStockTransferSequences.iq_tenant_id,
          inventoryStockTransferSequences.period_key,
        ],
        set: {
          last_value: sql`${inventoryStockTransferSequences.last_value} + 1`,
          updated_at: new Date(),
        },
      })
      .returning({ last_value: inventoryStockTransferSequences.last_value });

    const seq = row?.last_value ?? 1;
    return `TRF-${periodKey}-${String(seq).padStart(5, "0")}`;
  }
}
