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
  CancelStockTransferInput,
} from "../domain/transfer.types.js";
import { TransferValidationError } from "../errors.js";
import { deductStockFefo } from "../lib/deduct-stock-fefo.js";
import {
  mapStockAllocation,
  returnUnsettledFromAllocations,
} from "../lib/credit-stock.js";
import { qtyGreaterThan, qtyLessThan } from "../lib/qty-math.js";
import {
  applyReceiveLineStockMovements,
  resolveReceiveStatus,
  validateReceiveLine,
} from "../lib/transfer-receive.js";
import {
  inventoryIndentLines,
  inventoryIndents,
  inventoryItems,
  inventoryStockTransferAllocations,
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

        const deductions = await deductStockFefo(tx, {
          tenantId,
          storeId: transfer.from_store_id,
          itemId: line.item_id,
          qty: dispatchQty,
          transferDate: transfer.transfer_date,
        });

        if (deductions.length) {
          await tx.insert(inventoryStockTransferAllocations).values(
            deductions.map((deduction, index) => ({
              iq_tenant_id: tenantId,
              stock_transfer_line_id: line.id,
              source_stock_id: deduction.stockId,
              lot_id: deduction.lotId,
              qty: String(deduction.qty),
              sort_order: index,
            })),
          );
        }

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
      let allLinesFullyReceived = true;

      for (const line of existingLines) {
        const dispatchedQty = Number(line.transfer_qty);
        const receiveLine = receiveByItem.get(line.item_id);
        if (!receiveLine) {
          throw new TransferValidationError(`Missing receive line for item ${line.item_id}`);
        }

        const validated = validateReceiveLine(
          {
            itemId: line.item_id,
            lineId: line.id,
            dispatchedQty,
            previousReceived: Number(line.received_qty ?? 0),
            previousAccepted: Number(line.accepted_qty ?? 0),
            previousRejected: Number(line.rejected_qty ?? 0),
          },
          receiveLine,
        );

        if (qtyGreaterThan(validated.deltaAccepted, 0) || qtyGreaterThan(validated.deltaRejected, 0)) {
          const allocationRows = await tx
            .select()
            .from(inventoryStockTransferAllocations)
            .where(
              and(
                eq(inventoryStockTransferAllocations.iq_tenant_id, tenantId),
                eq(inventoryStockTransferAllocations.stock_transfer_line_id, line.id),
              ),
            )
            .orderBy(asc(inventoryStockTransferAllocations.sort_order));

          const allocations = allocationRows.map((row) => mapStockAllocation(row));

          await applyReceiveLineStockMovements(tx, {
            tenantId,
            toStoreId: transfer.to_store_id,
            itemId: line.item_id,
            transferDate: transfer.transfer_date,
            line: validated,
            allocations,
          });
        }

        await tx
          .update(inventoryStockTransferLines)
          .set({
            received_qty: String(validated.receivedQty),
            accepted_qty: String(validated.acceptedQty),
            rejected_qty: String(validated.rejectedQty),
            rejection_reason: validated.rejectionReason,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(inventoryStockTransferLines.iq_tenant_id, tenantId),
              eq(inventoryStockTransferLines.id, line.id),
            ),
          );

        totalAccepted += validated.acceptedQty;
        if (qtyLessThan(validated.receivedQty, dispatchedQty)) {
          allLinesFullyReceived = false;
        }
      }

      const nextStatus = resolveReceiveStatus(totalAccepted, allLinesFullyReceived);

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

  async cancel(
    tenantId: string,
    transferId: string,
    input: CancelStockTransferInput,
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

      if (transfer.status === "draft") {
        const [cancelled] = await tx
          .update(inventoryStockTransfers)
          .set({
            status: "cancelled",
            remarks: input.reason?.trim() || transfer.remarks,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(inventoryStockTransfers.iq_tenant_id, tenantId),
              eq(inventoryStockTransfers.id, transferId),
              eq(inventoryStockTransfers.status, "draft"),
            ),
          )
          .returning();

        if (!cancelled) {
          throw new TransferValidationError("Transfer could not be cancelled");
        }

        if (transfer.inventory_indent_id) {
          await this.restoreIndentAfterTransferCancel(tx, tenantId, transfer.inventory_indent_id);
        }

        return mapTransferRow(cancelled);
      }

      if (!["in_transit", "partially_received"].includes(transfer.status)) {
        throw new TransferValidationError("Only draft or in-transit transfers can be cancelled");
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

      for (const line of existingLines) {
        const dispatchedQty = Number(line.transfer_qty);
        const receivedQty = Number(line.received_qty ?? 0);
        const unsettledQty = dispatchedQty - receivedQty;

        if (qtyGreaterThan(unsettledQty, 0)) {
          const allocationRows = await tx
            .select()
            .from(inventoryStockTransferAllocations)
            .where(
              and(
                eq(inventoryStockTransferAllocations.iq_tenant_id, tenantId),
                eq(inventoryStockTransferAllocations.stock_transfer_line_id, line.id),
              ),
            )
            .orderBy(asc(inventoryStockTransferAllocations.sort_order));

          const allocations = allocationRows.map((row) => mapStockAllocation(row));
          await returnUnsettledFromAllocations(tx, tenantId, allocations, unsettledQty);
        }
      }

      const [cancelled] = await tx
        .update(inventoryStockTransfers)
        .set({
          status: "cancelled",
          remarks: input.reason?.trim() || transfer.remarks,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(inventoryStockTransfers.iq_tenant_id, tenantId),
            eq(inventoryStockTransfers.id, transferId),
            inArray(inventoryStockTransfers.status, ["in_transit", "partially_received"]),
          ),
        )
        .returning();

      if (!cancelled) {
        throw new TransferValidationError("Transfer could not be cancelled");
      }

      if (transfer.inventory_indent_id) {
        const totalAccepted = existingLines.reduce(
          (sum, line) => sum + Number(line.accepted_qty ?? 0),
          0,
        );
        if (totalAccepted > 0) {
          await tx
            .update(inventoryIndents)
            .set({ status: "fulfilled", fulfilled_at: new Date(), updated_at: new Date() })
            .where(
              and(
                eq(inventoryIndents.iq_tenant_id, tenantId),
                eq(inventoryIndents.id, transfer.inventory_indent_id),
              ),
            );
        } else {
          await this.restoreIndentAfterTransferCancel(tx, tenantId, transfer.inventory_indent_id);
        }
      }

      return mapTransferRow(cancelled);
    });
  }

  private async restoreIndentAfterTransferCancel(
    tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
    tenantId: string,
    indentId: string,
  ): Promise<void> {
    const lineRows = await tx
      .select({
        requested_qty: inventoryIndentLines.requested_qty,
        approved_qty: inventoryIndentLines.approved_qty,
      })
      .from(inventoryIndentLines)
      .where(
        and(
          eq(inventoryIndentLines.iq_tenant_id, tenantId),
          eq(inventoryIndentLines.indent_id, indentId),
        ),
      );

    const hasPartial = lineRows.some((line) => {
      const requested = Number(line.requested_qty);
      const approved = Number(line.approved_qty ?? 0);
      return approved > 0 && approved < requested;
    });

    await tx
      .update(inventoryIndents)
      .set({
        status: hasPartial ? "partially_approved" : "approved",
        inventory_stock_transfer_id: null,
        updated_at: new Date(),
      })
      .where(
        and(eq(inventoryIndents.iq_tenant_id, tenantId), eq(inventoryIndents.id, indentId)),
      );
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
