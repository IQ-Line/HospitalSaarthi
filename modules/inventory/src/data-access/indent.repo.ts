import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { toIlikeContainsPattern } from "../lib/ilike.js";
import type {
  ApproveIndentLineInput,
  IndentLineInput,
  IndentLineRow,
  IndentRow,
  ListIndentsQuery,
  SaveIndentDraftInput,
} from "../domain/indent.types.js";
import { ACTIVE_INDENT_STATUSES } from "../domain/indent.types.js";
import {
  inventoryIndentLines,
  inventoryIndents,
  inventoryIndentSequences,
  inventoryItems,
  inventoryLots,
  inventoryStock,
  inventoryStores,
} from "../schema/tables.js";
import { IndentValidationError } from "../errors.js";

function mapIndentRow(row: typeof inventoryIndents.$inferSelect): IndentRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    indent_number: row.indent_number,
    indent_date: row.indent_date,
    from_store_id: row.from_store_id,
    to_store_id: row.to_store_id,
    indent_type: row.indent_type as IndentRow["indent_type"],
    priority: row.priority as IndentRow["priority"],
    remarks: row.remarks,
    status: row.status as IndentRow["status"],
    fulfillment_route: row.fulfillment_route as IndentRow["fulfillment_route"],
    purchase_indent_number: row.purchase_indent_number,
    rejection_reason: row.rejection_reason,
    approval_remarks: row.approval_remarks,
    inventory_stock_transfer_id: row.inventory_stock_transfer_id,
    inventory_purchase_request_id: row.inventory_purchase_request_id,
    inventory_grn_id: row.inventory_grn_id,
    created_by: row.created_by,
    submitted_at: row.submitted_at,
    approved_at: row.approved_at,
    approved_by: row.approved_by,
    fulfilled_at: row.fulfilled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapIndentLineRow(row: typeof inventoryIndentLines.$inferSelect): IndentLineRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    indent_id: row.indent_id,
    item_id: row.item_id,
    requested_qty: row.requested_qty,
    approved_qty: row.approved_qty,
    line_remarks: row.line_remarks,
    preferred_lot_id: row.preferred_lot_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function listFilters(tenantId: string, query: ListIndentsQuery): SQL[] {
  const filters: SQL[] = [eq(inventoryIndents.iq_tenant_id, tenantId)];

  if (query.status) {
    filters.push(eq(inventoryIndents.status, query.status));
  }
  if (query.from_store_id) {
    filters.push(eq(inventoryIndents.from_store_id, query.from_store_id));
  }
  if (query.to_store_id) {
    filters.push(eq(inventoryIndents.to_store_id, query.to_store_id));
  }
  if (query.indent_type) {
    filters.push(eq(inventoryIndents.indent_type, query.indent_type));
  }

  const search = query.search?.trim();
  if (search) {
    const pattern = toIlikeContainsPattern(search);
    filters.push(
      or(
        sql`${inventoryIndents.indent_number} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${inventoryIndents.status} ILIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }

  return filters;
}

function draftNumber(): string {
  return `DRAFT-IND-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function validateApprovalInput(
  input: ApproveIndentLineInput,
  line: IndentLineRow,
): { hasApproved: boolean; hasPartial: boolean } {
  const requested = Number(line.requested_qty);
  if (!Number.isFinite(input.approved_qty) || input.approved_qty < 0) {
    throw new IndentValidationError("Approved quantity must be >= 0");
  }
  if (input.approved_qty > requested) {
    throw new IndentValidationError("Approved quantity cannot exceed requested quantity");
  }
  return {
    hasApproved: input.approved_qty > 0,
    hasPartial: input.approved_qty > 0 && input.approved_qty < requested,
  };
}

type StockTx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

async function transferApprovedQty(
  tx: StockTx,
  tenantId: string,
  fromStoreId: string,
  toStoreId: string,
  line: IndentLineRow,
  qty: number,
): Promise<void> {
  const stockRows = await tx
    .select({
      id: inventoryStock.id,
      lot_id: inventoryStock.lot_id,
      quantity: inventoryStock.quantity,
      expiry_date: inventoryLots.expiry_date,
    })
    .from(inventoryStock)
    .leftJoin(
      inventoryLots,
      and(
        eq(inventoryStock.iq_tenant_id, inventoryLots.iq_tenant_id),
        eq(inventoryStock.lot_id, inventoryLots.id),
      ),
    )
    .where(
      and(
        eq(inventoryStock.iq_tenant_id, tenantId),
        eq(inventoryStock.inventory_store_id, fromStoreId),
        eq(inventoryStock.item_id, line.item_id),
        sql`${inventoryStock.quantity}::numeric > 0`,
      ),
    )
    .orderBy(asc(inventoryLots.expiry_date), asc(inventoryStock.created_at));

  let remaining = qty;
  for (const stock of stockRows) {
    if (remaining <= 0) break;
    const available = Number(stock.quantity);
    if (available <= 0) continue;
    const move = Math.min(remaining, available);

    await tx
      .update(inventoryStock)
      .set({ quantity: String(available - move), updated_at: new Date() })
      .where(and(eq(inventoryStock.iq_tenant_id, tenantId), eq(inventoryStock.id, stock.id)));

    const [dest] = await tx
      .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.iq_tenant_id, tenantId),
          eq(inventoryStock.inventory_store_id, toStoreId),
          eq(inventoryStock.item_id, line.item_id),
          stock.lot_id ? eq(inventoryStock.lot_id, stock.lot_id) : sql`${inventoryStock.lot_id} IS NULL`,
        ),
      )
      .limit(1);

    if (dest) {
      await tx
        .update(inventoryStock)
        .set({ quantity: String(Number(dest.quantity) + move), updated_at: new Date() })
        .where(and(eq(inventoryStock.iq_tenant_id, tenantId), eq(inventoryStock.id, dest.id)));
    } else {
      await tx.insert(inventoryStock).values({
        iq_tenant_id: tenantId,
        item_id: line.item_id,
        inventory_store_id: toStoreId,
        lot_id: stock.lot_id,
        quantity: String(move),
      });
    }

    remaining -= move;
  }

  if (remaining > 0) {
    throw new IndentValidationError(`Insufficient stock at source store for item ${line.item_id}`);
  }
}

export class DrizzleInventoryIndentRepository {
  constructor(private readonly db: DbInstance) {}

  async nextIndentNumber(tenantId: string, indentDate: string): Promise<string> {
    const periodKey = indentDate.slice(0, 7).replace("-", "");
    const [row] = await this.db
      .insert(inventoryIndentSequences)
      .values({
        iq_tenant_id: tenantId,
        period_key: periodKey,
        last_value: 1,
      })
      .onConflictDoUpdate({
        target: [inventoryIndentSequences.iq_tenant_id, inventoryIndentSequences.period_key],
        set: {
          last_value: sql`${inventoryIndentSequences.last_value} + 1`,
          updated_at: new Date(),
        },
      })
      .returning({ last_value: inventoryIndentSequences.last_value });

    const seq = row?.last_value ?? 1;
    return `IND-${periodKey}-${String(seq).padStart(5, "0")}`;
  }

  async list(
    tenantId: string,
    query: ListIndentsQuery,
  ): Promise<{ rows: IndentRow[]; total: number }> {
    const where = and(...listFilters(tenantId, query));
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [countRows, rows] = await Promise.all([
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(inventoryIndents)
        .where(where),
      this.db
        .select()
        .from(inventoryIndents)
        .where(where)
        .orderBy(desc(inventoryIndents.indent_date), desc(inventoryIndents.created_at))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows: rows.map(mapIndentRow),
      total: countRows[0]?.total ?? 0,
    };
  }

  async findById(tenantId: string, indentId: string): Promise<IndentRow | undefined> {
    const [row] = await this.db
      .select()
      .from(inventoryIndents)
      .where(and(eq(inventoryIndents.iq_tenant_id, tenantId), eq(inventoryIndents.id, indentId)))
      .limit(1);
    return row ? mapIndentRow(row) : undefined;
  }

  async findByIds(tenantId: string, indentIds: string[]): Promise<IndentRow[]> {
    if (!indentIds.length) return [];
    const rows = await this.db
      .select()
      .from(inventoryIndents)
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          inArray(inventoryIndents.id, indentIds),
        ),
      );
    return rows.map(mapIndentRow);
  }

  async findByNumber(tenantId: string, indentNumber: string): Promise<IndentRow | undefined> {
    const normalized = indentNumber.trim();
    if (!normalized) return undefined;

    const [row] = await this.db
      .select()
      .from(inventoryIndents)
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          eq(inventoryIndents.indent_number, normalized),
        ),
      )
      .limit(1);
    return row ? mapIndentRow(row) : undefined;
  }

  async linkGrn(tenantId: string, indentId: string, grnId: string): Promise<void> {
    await this.db
      .update(inventoryIndents)
      .set({
        inventory_grn_id: grnId,
        status: "fulfilled",
        fulfilled_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(eq(inventoryIndents.iq_tenant_id, tenantId), eq(inventoryIndents.id, indentId)),
      );
  }

  async linkStockTransfer(tenantId: string, indentId: string, transferId: string): Promise<void> {
    const [row] = await this.db
      .update(inventoryIndents)
      .set({
        inventory_stock_transfer_id: transferId,
        status: "in_fulfillment",
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          eq(inventoryIndents.id, indentId),
          inArray(inventoryIndents.status, ["approved", "partially_approved"]),
          sql`${inventoryIndents.inventory_stock_transfer_id} IS NULL`,
        ),
      )
      .returning();

    if (!row) {
      throw new IndentValidationError("Indent is not eligible for stock transfer linking");
    }
  }

  async listLines(tenantId: string, indentId: string): Promise<IndentLineRow[]> {
    const rows = await this.db
      .select()
      .from(inventoryIndentLines)
      .where(
        and(eq(inventoryIndentLines.iq_tenant_id, tenantId), eq(inventoryIndentLines.indent_id, indentId)),
      )
      .orderBy(asc(inventoryIndentLines.sort_order), asc(inventoryIndentLines.created_at));
    return rows.map(mapIndentLineRow);
  }

  async listLinesWithItems(tenantId: string, indentId: string) {
    const rows = await this.db
      .select({
        line: inventoryIndentLines,
        item: {
          id: inventoryItems.id,
          item_code: inventoryItems.item_code,
          name: inventoryItems.name,
          unit_of_measure: inventoryItems.unit_of_measure,
          is_lot_tracked: inventoryItems.is_lot_tracked,
        },
      })
      .from(inventoryIndentLines)
      .leftJoin(
        inventoryItems,
        and(
          eq(inventoryIndentLines.iq_tenant_id, inventoryItems.iq_tenant_id),
          eq(inventoryIndentLines.item_id, inventoryItems.id),
        ),
      )
      .where(
        and(eq(inventoryIndentLines.iq_tenant_id, tenantId), eq(inventoryIndentLines.indent_id, indentId)),
      )
      .orderBy(asc(inventoryIndentLines.sort_order), asc(inventoryIndentLines.created_at));

    return rows.map((row) => ({
      ...mapIndentLineRow(row.line),
      item: row.item?.id
        ? {
            id: row.item.id,
            item_code: row.item.item_code,
            name: row.item.name,
            unit_of_measure: row.item.unit_of_measure,
            is_lot_tracked: row.item.is_lot_tracked,
          }
        : null,
    }));
  }

  async findStoresWithIndentMeta(tenantId: string, storeIds?: string[]) {
    const filters: SQL[] = [eq(inventoryStores.iq_tenant_id, tenantId), eq(inventoryStores.is_active, true)];
    if (storeIds?.length) {
      filters.push(inArray(inventoryStores.id, storeIds));
    }

    const rows = await this.db
      .select({
        id: inventoryStores.id,
        store_code: inventoryStores.store_code,
        store_name: inventoryStores.store_name,
        indent_authority: inventoryStores.indent_authority,
        indent_target_store_id: inventoryStores.indent_target_store_id,
      })
      .from(inventoryStores)
      .where(and(...filters))
      .orderBy(asc(inventoryStores.store_code));

    return rows;
  }

  /** Includes inactive stores so historical indents still show store names. */
  async findStoresByIds(tenantId: string, storeIds: string[]) {
    const uniqueIds = [...new Set(storeIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    return this.db
      .select({
        id: inventoryStores.id,
        store_code: inventoryStores.store_code,
        store_name: inventoryStores.store_name,
      })
      .from(inventoryStores)
      .where(
        and(eq(inventoryStores.iq_tenant_id, tenantId), inArray(inventoryStores.id, uniqueIds)),
      );
  }

  async listActiveIndentsForItem(
    tenantId: string,
    fromStoreId: string,
    itemId: string,
    excludeIndentId?: string,
    toStoreId?: string,
  ) {
    const filters: SQL[] = [
      eq(inventoryIndents.iq_tenant_id, tenantId),
      eq(inventoryIndents.from_store_id, fromStoreId),
      inArray(inventoryIndents.status, [...ACTIVE_INDENT_STATUSES]),
    ];
    if (toStoreId) {
      filters.push(eq(inventoryIndents.to_store_id, toStoreId));
    }
    if (excludeIndentId) {
      filters.push(sql`${inventoryIndents.id} <> ${excludeIndentId}::uuid`);
    }

    const rows = await this.db
      .select({
        indent_id: inventoryIndents.id,
        indent_number: inventoryIndents.indent_number,
        status: inventoryIndents.status,
      })
      .from(inventoryIndents)
      .innerJoin(
        inventoryIndentLines,
        and(
          eq(inventoryIndentLines.iq_tenant_id, inventoryIndents.iq_tenant_id),
          eq(inventoryIndentLines.indent_id, inventoryIndents.id),
          eq(inventoryIndentLines.item_id, itemId),
        ),
      )
      .where(and(...filters))
      .limit(20);

    return rows;
  }

  private async replaceLines(
    tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
    tenantId: string,
    indentId: string,
    lines: IndentLineInput[],
  ): Promise<void> {
    await tx
      .delete(inventoryIndentLines)
      .where(
        and(eq(inventoryIndentLines.iq_tenant_id, tenantId), eq(inventoryIndentLines.indent_id, indentId)),
      );

    if (lines.length === 0) return;

    await tx.insert(inventoryIndentLines).values(
      lines.map((line, index) => ({
        iq_tenant_id: tenantId,
        indent_id: indentId,
        item_id: line.item_id,
        requested_qty: String(line.requested_qty),
        line_remarks: line.line_remarks ?? null,
        preferred_lot_id: line.preferred_lot_id ?? null,
        sort_order: line.sort_order ?? index,
      })),
    );
  }

  async createDraft(
    tenantId: string,
    input: SaveIndentDraftInput,
    actorId: string | null,
  ): Promise<IndentRow> {
    return this.db.transaction(async (tx) => {
      const [header] = await tx
        .insert(inventoryIndents)
        .values({
          iq_tenant_id: tenantId,
          indent_number: draftNumber(),
          status: "draft",
          indent_date: input.indent_date,
          from_store_id: input.from_store_id,
          to_store_id: input.to_store_id ?? null,
          indent_type: input.indent_type,
          priority: input.priority,
          fulfillment_route: input.fulfillment_route,
          purchase_indent_number: input.purchase_indent_number?.trim() || null,
          remarks: input.remarks ?? null,
          created_by: actorId,
        })
        .returning();

      if (!header) throw new Error("Failed to create indent");

      await this.replaceLines(tx, tenantId, header.id, input.lines);
      return mapIndentRow(header);
    });
  }

  async updateDraft(
    tenantId: string,
    indentId: string,
    input: SaveIndentDraftInput,
  ): Promise<IndentRow | undefined> {
    return this.db.transaction(async (tx) => {
      const [header] = await tx
        .update(inventoryIndents)
        .set({
          indent_date: input.indent_date,
          from_store_id: input.from_store_id,
          to_store_id: input.to_store_id ?? null,
          indent_type: input.indent_type,
          priority: input.priority,
          fulfillment_route: input.fulfillment_route,
          purchase_indent_number: input.purchase_indent_number?.trim() || null,
          remarks: input.remarks ?? null,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(inventoryIndents.iq_tenant_id, tenantId),
            eq(inventoryIndents.id, indentId),
            eq(inventoryIndents.status, "draft"),
          ),
        )
        .returning();

      if (!header) return undefined;

      await this.replaceLines(tx, tenantId, indentId, input.lines);
      return mapIndentRow(header);
    });
  }

  async submit(tenantId: string, indentId: string): Promise<IndentRow | undefined> {
    const existing = await this.findById(tenantId, indentId);
    if (!existing) return undefined;
    if (existing.status !== "draft") {
      throw new IndentValidationError("Only draft indents can be submitted");
    }

    const lines = await this.listLines(tenantId, indentId);
    if (lines.length === 0) {
      throw new IndentValidationError("Indent has no lines");
    }

    const newNumber = await this.nextIndentNumber(tenantId, existing.indent_date);

    const [row] = await this.db
      .update(inventoryIndents)
      .set({
        status: "submitted",
        indent_number: newNumber,
        submitted_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          eq(inventoryIndents.id, indentId),
          eq(inventoryIndents.status, "draft"),
        ),
      )
      .returning();

    return row ? mapIndentRow(row) : undefined;
  }

  async approve(
    tenantId: string,
    indentId: string,
    lines: ApproveIndentLineInput[],
    actorId: string,
    approvalRemarks?: string | null,
  ): Promise<IndentRow | undefined> {
    const existing = await this.findById(tenantId, indentId);
    if (!existing) return undefined;
    if (existing.status !== "submitted") {
      throw new IndentValidationError("Only submitted indents can be approved");
    }

    const dbLines = await this.listLines(tenantId, indentId);
    const lineMap = new Map(dbLines.map((line) => [line.id, line]));
    let hasPartial = false;
    let hasApproved = false;

    for (const input of lines) {
      const line = lineMap.get(input.line_id);
      if (!line) {
        throw new IndentValidationError("Invalid indent line");
      }
      const flags = validateApprovalInput(input, line);
      if (flags.hasApproved) hasApproved = true;
      if (flags.hasPartial) hasPartial = true;

      await this.db
        .update(inventoryIndentLines)
        .set({
          approved_qty: String(input.approved_qty),
          updated_at: new Date(),
        })
        .where(
          and(
            eq(inventoryIndentLines.iq_tenant_id, tenantId),
            eq(inventoryIndentLines.id, input.line_id),
          ),
        );
    }

    if (!hasApproved) {
      throw new IndentValidationError("At least one line must have approved quantity > 0");
    }

    if (hasPartial) {
      const trimmed = approvalRemarks?.trim() ?? "";
      if (!trimmed) {
        throw new IndentValidationError("Approval remarks are required for partial approval");
      }
    }

    const nextStatus = hasPartial ? "partially_approved" : "approved";

    const [row] = await this.db
      .update(inventoryIndents)
      .set({
        status: nextStatus,
        approval_remarks: hasPartial ? approvalRemarks?.trim() ?? null : null,
        approved_at: new Date(),
        approved_by: actorId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          eq(inventoryIndents.id, indentId),
          eq(inventoryIndents.status, "submitted"),
        ),
      )
      .returning();

    return row ? mapIndentRow(row) : undefined;
  }

  async reject(
    tenantId: string,
    indentId: string,
    reason: string,
  ): Promise<IndentRow | undefined> {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new IndentValidationError("Rejection reason is required");
    }

    const [row] = await this.db
      .update(inventoryIndents)
      .set({
        status: "rejected",
        rejection_reason: trimmed,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          eq(inventoryIndents.id, indentId),
          eq(inventoryIndents.status, "submitted"),
        ),
      )
      .returning();

    return row ? mapIndentRow(row) : undefined;
  }

  async cancelDraft(tenantId: string, indentId: string): Promise<boolean> {
    const existing = await this.findById(tenantId, indentId);
    if (!existing || existing.status !== "draft") {
      return false;
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(inventoryIndentLines)
        .where(
          and(
            eq(inventoryIndentLines.iq_tenant_id, tenantId),
            eq(inventoryIndentLines.indent_id, indentId),
          ),
        );
      await tx
        .delete(inventoryIndents)
        .where(
          and(
            eq(inventoryIndents.iq_tenant_id, tenantId),
            eq(inventoryIndents.id, indentId),
            eq(inventoryIndents.status, "draft"),
          ),
        );
    });

    return true;
  }

  async fulfillStockTransfer(tenantId: string, indentId: string): Promise<IndentRow | undefined> {
    const existing = await this.findById(tenantId, indentId);
    if (!existing) return undefined;
    if (!["approved", "partially_approved"].includes(existing.status)) {
      throw new IndentValidationError("Only approved indents can be fulfilled");
    }
    if (
      existing.inventory_stock_transfer_id ||
      existing.inventory_purchase_request_id ||
      existing.inventory_grn_id
    ) {
      throw new IndentValidationError("Indent fulfillment already initiated");
    }
    if (!existing.to_store_id) {
      throw new IndentValidationError("Destination store is required for stock transfer fulfillment");
    }
    const toStoreId = existing.to_store_id;

    const lines = await this.listLines(tenantId, indentId);

    await this.db.transaction(async (tx) => {
      for (const line of lines) {
        const qty = Number(line.approved_qty ?? 0);
        if (qty <= 0) continue;
        await transferApprovedQty(
          tx,
          tenantId,
          existing.from_store_id,
          toStoreId,
          line,
          qty,
        );
      }

      await tx
        .update(inventoryIndents)
        .set({
          status: "fulfilled",
          fulfilled_at: new Date(),
          updated_at: new Date(),
        })
        .where(
          and(eq(inventoryIndents.iq_tenant_id, tenantId), eq(inventoryIndents.id, indentId)),
        );
    });

    return this.findById(tenantId, indentId);
  }

  async linkProcurementFulfillment(
    tenantId: string,
    indentId: string,
    grnId: string,
  ): Promise<IndentRow | undefined> {
    const [row] = await this.db
      .update(inventoryIndents)
      .set({
        status: "in_fulfillment",
        inventory_grn_id: grnId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryIndents.iq_tenant_id, tenantId),
          eq(inventoryIndents.id, indentId),
          inArray(inventoryIndents.status, ["approved", "partially_approved"]),
        ),
      )
      .returning();

    return row ? mapIndentRow(row) : undefined;
  }
}
