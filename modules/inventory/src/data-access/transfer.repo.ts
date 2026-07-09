import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { toIlikeContainsPattern } from "../lib/ilike.js";
import type {
  CreateStockTransferInput,
  DispatchStockTransferInput,
  ListStockTransfersQuery,
  ReceiveStockTransferInput,
  StockTransferLineRow,
  StockTransferRow,
} from "../domain/transfer.types.js";
import { TransferValidationError } from "../errors.js";
import { creditStockToStore } from "../lib/credit-stock.js";
import { deductStockFefo } from "../lib/deduct-stock-fefo.js";
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
    received_qty: row.received_qty,
    accepted_qty: row.accepted_qty,
    rejected_qty: row.rejected_qty,
    rejection_reason: row.rejection_reason,
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

  if (query.statuses?.length) {
    filters.push(inArray(inventoryStockTransfers.status, query.statuses));
  }

  if (query.from_store_id) {
    filters.push(eq(inventoryStockTransfers.from_store_id, query.from_store_id));
  }

  if (query.to_store_id) {
    filters.push(eq(inventoryStockTransfers.to_store_id, query.to_store_id));
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

  async dispatch(
    tenantId: string,
    transferId: string,
    input: DispatchStockTransferInput,
  ): Promise<StockTransferRow> {
    return this.db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(inventoryStockTransfers)
        .where(
          and(
            eq(inventoryStockTransfers.iq_tenant_id, tenantId),
            eq(inventoryStockTransfers.id, transferId),
          ),
        )
        .limit(1);

      if (!transfer) {
        throw new TransferValidationError("Transfer not found");
      }
      if (transfer.status !== "draft") {
        throw new TransferValidationError("Only draft transfers can be dispatched");
      }

      const existingLines = await tx
        .select()
        .from(inventoryStockTransferLines)
        .where(
          and(
            eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
            eq(inventoryStockTransferLines.stock_transfer_id, transferId),
          ),
        )
        .orderBy(asc(inventoryStockTransferLines.sort_order));

      if (!existingLines.length) {
        throw new TransferValidationError("Transfer has no lines");
      }

      const dispatchByItem = new Map(
        (input.lines ?? []).map((line) => [line.item_id, line]),
      );

      for (const line of existingLines) {
        const override = dispatchByItem.get(line.item_id);
        const dispatchQty = override?.dispatch_qty ?? Number(line.transfer_qty);

        if (!Number.isFinite(dispatchQty) || dispatchQty <= 0) {
          throw new TransferValidationError("Dispatch quantity must be greater than zero");
        }
        if (dispatchQty > Number(line.transfer_qty)) {
          throw new TransferValidationError("Dispatch quantity cannot exceed transfer line quantity");
        }

        const [item] = await tx
          .select({ id: inventoryItems.id, is_active: inventoryItems.is_active })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.iq_tenant_id, tenantId),
              eq(inventoryItems.id, line.item_id),
            ),
          )
          .limit(1);

        if (!item?.is_active) {
          throw new TransferValidationError(`Item ${line.item_id} is inactive`);
        }

        await deductStockFefo(tx, {
          tenantId,
          storeId: transfer.from_store_id,
          itemId: line.item_id,
          qty: dispatchQty,
          transferDate: transfer.transfer_date,
        });

        if (dispatchQty !== Number(line.transfer_qty)) {
          await tx
            .update(inventoryStockTransferLines)
            .set({ transfer_qty: String(dispatchQty), updated_at: new Date() })
            .where(
              and(
                eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
                eq(inventoryStockTransferLines.id, line.id),
              ),
            );
        }
      }

      const [dispatched] = await tx
        .update(inventoryStockTransfers)
        .set({ status: "in_transit", updated_at: new Date() })
        .where(
          and(
            eq(inventoryStockTransfers.iq_tenant_id, tenantId),
            eq(inventoryStockTransfers.id, transferId),
            eq(inventoryStockTransfers.status, "draft"),
          ),
        )
        .returning();

      if (!dispatched) {
        throw new TransferValidationError("Transfer could not be dispatched");
      }

      return mapTransferRow(dispatched);
    });
  }

  async countLinesByTransferIds(
    tenantId: string,
    transferIds: string[],
  ): Promise<Map<string, number>> {
    if (!transferIds.length) return new Map();
    const rows = await this.db
      .select({
        stock_transfer_id: inventoryStockTransferLines.stock_transfer_id,
        count: sql<number>`count(*)::int`,
      })
      .from(inventoryStockTransferLines)
      .where(
        and(
          eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
          inArray(inventoryStockTransferLines.stock_transfer_id, transferIds),
        ),
      )
      .groupBy(inventoryStockTransferLines.stock_transfer_id);

    return new Map(rows.map((row) => [row.stock_transfer_id, row.count]));
  }

  async receive(
    tenantId: string,
    transferId: string,
    input: ReceiveStockTransferInput,
  ): Promise<StockTransferRow> {
    return this.db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(inventoryStockTransfers)
        .where(
          and(
            eq(inventoryStockTransfers.iq_tenant_id, tenantId),
            eq(inventoryStockTransfers.id, transferId),
          ),
        )
        .limit(1);

      if (!transfer) {
        throw new TransferValidationError("Transfer not found");
      }
      if (!["in_transit", "partially_received"].includes(transfer.status)) {
        throw new TransferValidationError("Only dispatched transfers can be received");
      }

      const existingLines = await tx
        .select()
        .from(inventoryStockTransferLines)
        .where(
          and(
            eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
            eq(inventoryStockTransferLines.stock_transfer_id, transferId),
          ),
        )
        .orderBy(asc(inventoryStockTransferLines.sort_order));

      if (!existingLines.length) {
        throw new TransferValidationError("Transfer has no lines");
      }

      const receiveByItem = new Map(input.lines.map((line) => [line.item_id, line]));
      let totalAccepted = 0;
      let totalRejected = 0;
      let totalDispatched = 0;

      for (const line of existingLines) {
        const dispatchedQty = Number(line.transfer_qty);
        totalDispatched += dispatchedQty;
        const receiveLine = receiveByItem.get(line.item_id);
        if (!receiveLine) {
          throw new TransferValidationError(`Missing receive line for item ${line.item_id}`);
        }

        const receivedQty = receiveLine.received_qty;
        const acceptedQty = receiveLine.accepted_qty;
        const rejectedQty = receiveLine.rejected_qty ?? Math.max(0, receivedQty - acceptedQty);

        if (!Number.isFinite(receivedQty) || receivedQty < 0) {
          throw new TransferValidationError("Received quantity must be >= 0");
        }
        if (!Number.isFinite(acceptedQty) || acceptedQty < 0) {
          throw new TransferValidationError("Accepted quantity must be >= 0");
        }
        if (receivedQty > dispatchedQty) {
          throw new TransferValidationError("Received quantity cannot exceed dispatched quantity");
        }
        if (acceptedQty > receivedQty) {
          throw new TransferValidationError("Accepted quantity cannot exceed received quantity");
        }
        if (acceptedQty + rejectedQty !== receivedQty) {
          throw new TransferValidationError("Accepted and rejected quantities must equal received quantity");
        }
        if (rejectedQty > 0 && !receiveLine.rejection_reason?.trim()) {
          throw new TransferValidationError("Rejection reason is required when quantity is rejected");
        }

        if (acceptedQty > 0) {
          await creditStockToStore(tx, {
            tenantId,
            storeId: transfer.to_store_id,
            itemId: line.item_id,
            qty: acceptedQty,
          });
        }

        await tx
          .update(inventoryStockTransferLines)
          .set({
            received_qty: String(receivedQty),
            accepted_qty: String(acceptedQty),
            rejected_qty: String(rejectedQty),
            rejection_reason: receiveLine.rejection_reason?.trim() || null,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
              eq(inventoryStockTransferLines.id, line.id),
            ),
          );

        totalAccepted += acceptedQty;
        totalRejected += rejectedQty;
      }

      let nextStatus: StockTransferRow["status"];
      if (totalAccepted <= 0) {
        nextStatus = "rejected";
      } else if (totalAccepted < totalDispatched || totalRejected > 0) {
        nextStatus = "partially_received";
      } else {
        nextStatus = "completed";
      }

      const [received] = await tx
        .update(inventoryStockTransfers)
        .set({ status: nextStatus, updated_at: new Date() })
        .where(
          and(
            eq(inventoryStockTransfers.iq_tenant_id, tenantId),
            eq(inventoryStockTransfers.id, transferId),
            inArray(inventoryStockTransfers.status, ["in_transit", "partially_received"]),
          ),
        )
        .returning();

      if (!received) {
        throw new TransferValidationError("Transfer could not be received");
      }

      if (nextStatus === "completed" && transfer.inventory_indent_id) {
        await tx
          .update(inventoryIndents)
          .set({ status: "fulfilled", fulfilled_at: new Date(), updated_at: new Date() })
          .where(
            and(
              eq(inventoryIndents.iq_tenant_id, tenantId),
              eq(inventoryIndents.id, transfer.inventory_indent_id),
            ),
          );
      }

      return mapTransferRow(received);
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
