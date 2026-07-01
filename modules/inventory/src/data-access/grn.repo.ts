import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, or, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { toIlikeContainsPattern } from "../lib/ilike.js";
import type {
  CreateGrnInput,
  CreateGrnLineInput,
  GrnLineRow,
  GrnRow,
  GrnSummary,
  ListGrnsQuery,
  UpdateGrnInput,
} from "../domain/grn.types.js";
import { inventoryGrnLines, inventoryGrns, inventoryItems } from "../schema/tables.js";

function mapGrnRow(row: typeof inventoryGrns.$inferSelect): GrnRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    grn_number: row.grn_number,
    status: row.status as GrnRow["status"],
    grn_type: row.grn_type as GrnRow["grn_type"],
    grn_date: row.grn_date,
    inventory_store_id: row.inventory_store_id,
    manufacturer_id: row.manufacturer_id,
    purchase_request_id: row.purchase_request_id,
    voucher_invoice_no: row.voucher_invoice_no,
    register_page_no: row.register_page_no,
    remarks: row.remarks,
    shipment_document_path: row.shipment_document_path,
    voucher_document_path: row.voucher_document_path,
    created_by: row.created_by,
    submitted_at: row.submitted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapGrnLineRow(row: typeof inventoryGrnLines.$inferSelect): GrnLineRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    grn_id: row.grn_id,
    item_id: row.item_id,
    pr_line_id: row.pr_line_id,
    requested_qty: row.requested_qty,
    grn_qty: row.grn_qty,
    base_uom: row.base_uom,
    purchase_uom: row.purchase_uom,
    purchase_to_base_factor: row.purchase_to_base_factor,
    storage_location: row.storage_location,
    lot_number: row.lot_number,
    expiry_date: row.expiry_date,
    purchase_rate: row.purchase_rate,
    line_remarks: row.line_remarks,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function listFilters(tenantId: string, query: ListGrnsQuery): SQL[] {
  const filters: SQL[] = [eq(inventoryGrns.iq_tenant_id, tenantId)];

  if (query.summary_filter === "draft") {
    filters.push(eq(inventoryGrns.status, "draft"));
  } else if (query.summary_filter === "submitted") {
    filters.push(eq(inventoryGrns.status, "submitted"));
  } else if (query.summary_filter === "purchase") {
    filters.push(eq(inventoryGrns.grn_type, "purchase"));
  }

  if (query.status) {
    filters.push(eq(inventoryGrns.status, query.status));
  }

  if (query.grn_type) {
    filters.push(eq(inventoryGrns.grn_type, query.grn_type));
  }

  const search = query.search?.trim();
  if (search) {
    const pattern = toIlikeContainsPattern(search);
    filters.push(
      or(
        sql`${inventoryGrns.grn_number} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${inventoryGrns.voucher_invoice_no} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${inventoryGrns.status} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${inventoryGrns.grn_type} ILIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }

  return filters;
}

function buildGrnNumber(grnDate: string): string {
  const datePart = grnDate.replace(/-/g, "");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `GRN-${datePart}-${suffix}`;
}

export class DrizzleInventoryGrnRepository {
  constructor(private readonly db: DbInstance) {}

  async summary(tenantId: string): Promise<GrnSummary> {
    const [row] = await this.db
      .select({
        all: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) filter (where ${inventoryGrns.status} = 'draft')::int`,
        submitted: sql<number>`count(*) filter (where ${inventoryGrns.status} = 'submitted')::int`,
        purchase: sql<number>`count(*) filter (where ${inventoryGrns.grn_type} = 'purchase')::int`,
      })
      .from(inventoryGrns)
      .where(eq(inventoryGrns.iq_tenant_id, tenantId));

    return {
      all: row?.all ?? 0,
      draft: row?.draft ?? 0,
      submitted: row?.submitted ?? 0,
      purchase: row?.purchase ?? 0,
    };
  }

  async list(
    tenantId: string,
    query: ListGrnsQuery,
  ): Promise<{ rows: GrnRow[]; total: number; summary: GrnSummary }> {
    const where = and(...listFilters(tenantId, query));
    const [summary, countRows, rows] = await Promise.all([
      this.summary(tenantId),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(inventoryGrns)
        .where(where),
      this.db
        .select()
        .from(inventoryGrns)
        .where(where)
        .orderBy(desc(inventoryGrns.grn_date), desc(inventoryGrns.created_at)),
    ]);

    return {
      rows: rows.map(mapGrnRow),
      total: countRows[0]?.total ?? 0,
      summary,
    };
  }

  async findById(tenantId: string, grnId: string): Promise<GrnRow | undefined> {
    const [row] = await this.db
      .select()
      .from(inventoryGrns)
      .where(and(eq(inventoryGrns.iq_tenant_id, tenantId), eq(inventoryGrns.id, grnId)))
      .limit(1);
    return row ? mapGrnRow(row) : undefined;
  }

  async listLines(tenantId: string, grnId: string): Promise<GrnLineRow[]> {
    const rows = await this.db
      .select()
      .from(inventoryGrnLines)
      .where(and(eq(inventoryGrnLines.iq_tenant_id, tenantId), eq(inventoryGrnLines.grn_id, grnId)))
      .orderBy(asc(inventoryGrnLines.sort_order), asc(inventoryGrnLines.created_at));
    return rows.map(mapGrnLineRow);
  }

  async listLinesWithItems(tenantId: string, grnId: string) {
    const rows = await this.db
      .select({
        line: inventoryGrnLines,
        item: {
          id: inventoryItems.id,
          item_code: inventoryItems.item_code,
          name: inventoryItems.name,
          unit_of_measure: inventoryItems.unit_of_measure,
        },
      })
      .from(inventoryGrnLines)
      .leftJoin(
        inventoryItems,
        and(
          eq(inventoryGrnLines.iq_tenant_id, inventoryItems.iq_tenant_id),
          eq(inventoryGrnLines.item_id, inventoryItems.id),
        ),
      )
      .where(and(eq(inventoryGrnLines.iq_tenant_id, tenantId), eq(inventoryGrnLines.grn_id, grnId)))
      .orderBy(asc(inventoryGrnLines.sort_order), asc(inventoryGrnLines.created_at));

    return rows.map((row) => ({
      ...mapGrnLineRow(row.line),
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

  async create(tenantId: string, input: CreateGrnInput, actorId: string | null): Promise<GrnRow> {
    const draftNumber = `DRAFT-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

    return this.db.transaction(async (tx) => {
      const [header] = await tx
        .insert(inventoryGrns)
        .values({
          iq_tenant_id: tenantId,
          grn_number: draftNumber,
          status: "draft",
          grn_type: input.grn_type,
          grn_date: input.grn_date,
          inventory_store_id: input.store_id,
          manufacturer_id: input.manufacturer_id ?? null,
          purchase_request_id: input.purchase_request_id ?? null,
          voucher_invoice_no: input.voucher_invoice_no?.trim() ?? "",
          register_page_no: input.register_page_no ?? null,
          remarks: input.remarks ?? null,
          created_by: actorId,
        })
        .returning();

      if (!header) {
        throw new Error("Failed to create GRN");
      }

      if (input.lines?.length) {
        await tx.insert(inventoryGrnLines).values(
          input.lines.map((line, index) => ({
            iq_tenant_id: tenantId,
            grn_id: header.id,
            item_id: line.item_id,
            grn_qty: String(line.grn_qty),
            base_uom: line.base_uom,
            purchase_to_base_factor: "1",
            storage_location: line.storage_location ?? null,
            lot_number: line.lot_number ?? "",
            expiry_date: line.expiry_date ?? null,
            purchase_rate: String(line.purchase_rate),
            line_remarks: line.line_remarks ?? null,
            sort_order: line.sort_order ?? index,
          })),
        );
      }

      return mapGrnRow(header);
    });
  }

  async updateDraft(
    tenantId: string,
    grnId: string,
    input: UpdateGrnInput,
  ): Promise<GrnRow | undefined> {
    const patch: Partial<typeof inventoryGrns.$inferInsert> = {
      updated_at: new Date(),
    };

    if (input.grn_type !== undefined) patch.grn_type = input.grn_type;
    if (input.grn_date !== undefined) patch.grn_date = input.grn_date;
    if (input.store_id !== undefined) patch.inventory_store_id = input.store_id;
    if (input.manufacturer_id !== undefined) patch.manufacturer_id = input.manufacturer_id;
    if (input.purchase_request_id !== undefined) patch.purchase_request_id = input.purchase_request_id;
    if (input.voucher_invoice_no !== undefined) patch.voucher_invoice_no = input.voucher_invoice_no;
    if (input.register_page_no !== undefined) patch.register_page_no = input.register_page_no;
    if (input.remarks !== undefined) patch.remarks = input.remarks;

    const [row] = await this.db
      .update(inventoryGrns)
      .set(patch)
      .where(
        and(
          eq(inventoryGrns.iq_tenant_id, tenantId),
          eq(inventoryGrns.id, grnId),
          eq(inventoryGrns.status, "draft"),
        ),
      )
      .returning();

    return row ? mapGrnRow(row) : undefined;
  }

  async replaceLines(tenantId: string, grnId: string, lines: CreateGrnLineInput[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [header] = await tx
        .select({ id: inventoryGrns.id })
        .from(inventoryGrns)
        .where(
          and(
            eq(inventoryGrns.iq_tenant_id, tenantId),
            eq(inventoryGrns.id, grnId),
            eq(inventoryGrns.status, "draft"),
          ),
        )
        .limit(1);

      if (!header) return;

      await tx
        .delete(inventoryGrnLines)
        .where(and(eq(inventoryGrnLines.iq_tenant_id, tenantId), eq(inventoryGrnLines.grn_id, grnId)));

      if (lines.length === 0) return;

      await tx.insert(inventoryGrnLines).values(
        lines.map((line, index) => ({
          iq_tenant_id: tenantId,
          grn_id: grnId,
          item_id: line.item_id,
          grn_qty: String(line.grn_qty),
          base_uom: line.base_uom,
          purchase_to_base_factor: "1",
          storage_location: line.storage_location ?? null,
          lot_number: line.lot_number ?? "",
          expiry_date: line.expiry_date ?? null,
          purchase_rate: String(line.purchase_rate),
          line_remarks: line.line_remarks ?? null,
          sort_order: line.sort_order ?? index,
        })),
      );
    });
  }

  async submit(tenantId: string, grnId: string): Promise<GrnRow | undefined> {
    const existing = await this.findById(tenantId, grnId);
    if (!existing || existing.status !== "draft") return undefined;

    const grnNumber = buildGrnNumber(existing.grn_date);
    const [row] = await this.db
      .update(inventoryGrns)
      .set({
        status: "submitted",
        grn_number: grnNumber,
        submitted_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryGrns.iq_tenant_id, tenantId),
          eq(inventoryGrns.id, grnId),
          eq(inventoryGrns.status, "draft"),
        ),
      )
      .returning();

    return row ? mapGrnRow(row) : undefined;
  }
}
