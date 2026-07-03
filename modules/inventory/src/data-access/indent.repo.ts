import { and, eq } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { IndentLineRow, IndentRow } from "../domain/indent.types.js";
import type { IndentRepo } from "../ports.js";
import { inventoryIndentLines, inventoryIndents } from "../schema/tables.js";

function mapIndentRow(row: typeof inventoryIndents.$inferSelect): IndentRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    indent_number: row.indent_number,
    indent_date: row.indent_date,
    from_store_id: row.from_store_id,
    to_store_id: row.to_store_id,
    indent_type: row.indent_type as IndentRow["indent_type"],
    fulfillment_route: row.fulfillment_route as IndentRow["fulfillment_route"],
    priority: row.priority,
    remarks: row.remarks,
    status: row.status as IndentRow["status"],
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
    sort_order: row.sort_order,
  };
}

export function createIndentRepo(db: DbInstance): IndentRepo {
  return {
    async findById(tenantId, indentId) {
      const [row] = await db
        .select()
        .from(inventoryIndents)
        .where(
          and(eq(inventoryIndents.iq_tenant_id, tenantId), eq(inventoryIndents.id, indentId)),
        )
        .limit(1);
      return row ? mapIndentRow(row) : undefined;
    },

    async findByNumber(tenantId, indentNumber) {
      const normalized = indentNumber.trim();
      if (!normalized) return undefined;

      const [row] = await db
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
    },

    async listLines(tenantId, indentId) {
      const rows = await db
        .select()
        .from(inventoryIndentLines)
        .where(
          and(
            eq(inventoryIndentLines.iq_tenant_id, tenantId),
            eq(inventoryIndentLines.indent_id, indentId),
          ),
        );
      return rows.map(mapIndentLineRow);
    },

    async linkGrn(tenantId, indentId, grnId) {
      await db
        .update(inventoryIndents)
        .set({
          inventory_grn_id: grnId,
          updated_at: new Date(),
        })
        .where(
          and(eq(inventoryIndents.iq_tenant_id, tenantId), eq(inventoryIndents.id, indentId)),
        );
    },
  };
}
