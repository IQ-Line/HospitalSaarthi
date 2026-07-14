import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  sql,
  tenantColumn,
} from "@hims/ts-sdk-db";

export const INVENTORY_SCHEMA_NAME = "inventory" as const;
export const inventorySchema = pgSchema(INVENTORY_SCHEMA_NAME);

// Reference masters (categories, UOMs, store types, …) live in master-data
// (global_master / tenant_master). Operational tables below hold UUID refs only.

// ─── Stores ──────────────────────────────────────────────────────────────────

export const inventoryStores = inventorySchema.table(
  "stores",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    store_code: text("store_code").notNull(),
    store_name: text("store_name").notNull(),
    store_type_id: uuid("store_type_id").notNull(),
    facility_id: uuid("facility_id").notNull(),
    branch_id: uuid("branch_id").notNull(),
    department_id: uuid("department_id"),
    physical_location: text("physical_location").notNull().default(""),
    can_receive_stock: boolean("can_receive_stock").notNull().default(false),
    can_dispense: boolean("can_dispense").notNull().default(false),
    can_issue_to_ward: boolean("can_issue_to_ward").notNull().default(false),
    track_batch_expiry: boolean("track_batch_expiry").notNull().default(true),
    indent_authority: boolean("indent_authority").notNull().default(false),
    indent_target_store_id: uuid("indent_target_store_id"),
    is_central_store: boolean("is_central_store").notNull().default(false),
    is_active: boolean("is_active").notNull().default(true),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inventory_stores_tenant_store_code").on(t.iq_tenant_id, t.store_code),
    index("idx_inventory_stores_tenant_branch").on(t.iq_tenant_id, t.branch_id),
    index("idx_inventory_stores_tenant_store_type").on(t.iq_tenant_id, t.store_type_id),
    uniqueIndex("uq_inventory_stores_tenant_central_store")
      .on(t.iq_tenant_id)
      .where(sql`${t.is_central_store} = true`),
    foreignKey({
      name: "inventory_stores_indent_target_store_fk",
      columns: [t.iq_tenant_id, t.indent_target_store_id],
      foreignColumns: [t.iq_tenant_id, t.id],
    })
      .onDelete("set null")
      .onUpdate("no action"),
  ],
);

// ─── Sequences ───────────────────────────────────────────────────────────────

export const inventoryStoreCodeSequences = inventorySchema.table(
  "store_code_sequences",
  {
    ...tenantColumn(),
    store_type_id: uuid("store_type_id").notNull(),
    last_sequence: integer("last_sequence").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.store_type_id] })],
);

export const inventoryItemCodeSequences = inventorySchema.table(
  "item_code_sequences",
  {
    ...tenantColumn(),
    item_type_id: uuid("item_type_id").notNull(),
    last_sequence: integer("last_sequence").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.item_type_id] })],
);

export const inventoryIndentSequences = inventorySchema.table(
  "indent_sequences",
  {
    ...tenantColumn(),
    period_key: text("period_key").notNull(),
    last_value: integer("last_value").notNull().default(0),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.period_key] })],
);

// ─── Item catalog ────────────────────────────────────────────────────────────

export const inventoryItems = inventorySchema.table(
  "items",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    item_classification: text("item_classification").notNull().default("inventory"),
    item_code: text("item_code").notNull(),
    name: text("name").notNull(),
    display_name: text("display_name").notNull(),
    category_id: uuid("category_id"),
    sub_category_id: uuid("sub_category_id"),
    item_type_id: uuid("item_type_id").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    catalog_version: integer("catalog_version").notNull().default(1),
    tenant_formulary_id: uuid("tenant_formulary_id"),
    platform_medicine_id: uuid("platform_medicine_id"),
    manufacturer_id: uuid("manufacturer_id"),
    manufacturer_item_code: text("manufacturer_item_code"),
    catalog_number: text("catalog_number"),
    hsn_gst_id: uuid("hsn_gst_id"),
    purchase_uom_id: uuid("purchase_uom_id").notNull(),
    consumption_uom_id: uuid("consumption_uom_id").notNull(),
    sale_uom_id: uuid("sale_uom_id").notNull(),
    conversion_factor: numeric("conversion_factor", { precision: 18, scale: 6 })
      .notNull()
      .default("1"),
    tracking_mode: text("tracking_mode").notNull().default("lot"),
    is_expirable: boolean("is_expirable").notNull().default(false),
    is_short_expiry_monitoring: boolean("is_short_expiry_monitoring").notNull().default(false),
    loose_sale_allowed: boolean("loose_sale_allowed").notNull().default(false),
    reorder_point: numeric("reorder_point", { precision: 12, scale: 3 }).notNull().default("0"),
    storage_condition_id: uuid("storage_condition_id"),
    pack_size: text("pack_size"),
    length_cm: numeric("length_cm", { precision: 10, scale: 2 }),
    width_cm: numeric("width_cm", { precision: 10, scale: 2 }),
    height_cm: numeric("height_cm", { precision: 10, scale: 2 }),
    weight_kg: numeric("weight_kg", { precision: 10, scale: 3 }),
    item_image_url: text("item_image_url"),
    supporting_document_url: text("supporting_document_url"),
    unit_of_measure: text("unit_of_measure").notNull(),
    storage_conditions: text("storage_conditions"),
    description: text("description"),
    supply_attributes: jsonb("supply_attributes").notNull().default({}),
    is_lot_tracked: boolean("is_lot_tracked").notNull().default(true),
    is_serial_tracked: boolean("is_serial_tracked").notNull().default(false),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inventory_items_tenant_item_code").on(t.iq_tenant_id, t.item_code),
    index("idx_inventory_items_tenant_classification").on(t.iq_tenant_id, t.item_classification),
    index("idx_inventory_items_tenant_active").on(t.iq_tenant_id, t.is_active),
    index("idx_inventory_items_category").on(t.iq_tenant_id, t.category_id),
    index("idx_inventory_items_item_type").on(t.iq_tenant_id, t.item_type_id),
  ],
);

// ─── GRN ─────────────────────────────────────────────────────────────────────

export const inventoryGrns = inventorySchema.table(
  "grns",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    grn_number: text("grn_number").notNull(),
    status: text("status").notNull().default("draft"),
    grn_type: text("grn_type").notNull().default("purchase"),
    grn_date: date("grn_date").notNull(),
    inventory_store_id: uuid("inventory_store_id").notNull(),
    manufacturer_id: uuid("manufacturer_id"),
    purchase_request_id: uuid("purchase_request_id"),
    inventory_indent_id: uuid("inventory_indent_id"),
    voucher_invoice_no: text("voucher_invoice_no").notNull().default(""),
    register_page_no: text("register_page_no"),
    remarks: text("remarks"),
    shipment_document_path: text("shipment_document_path"),
    voucher_document_path: text("voucher_document_path"),
    created_by: uuid("created_by"),
    submitted_at: timestamp("submitted_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inventory_grns_tenant_number").on(t.iq_tenant_id, t.grn_number),
    index("idx_inventory_grns_tenant_status_date").on(t.iq_tenant_id, t.status, t.grn_date),
    foreignKey({
      name: "inventory_grns_store_fk",
      columns: [t.iq_tenant_id, t.inventory_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

export const inventoryGrnLines = inventorySchema.table(
  "grn_lines",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    grn_id: uuid("grn_id").notNull(),
    item_id: uuid("item_id").notNull(),
    pr_line_id: uuid("pr_line_id"),
    requested_qty: numeric("requested_qty", { precision: 12, scale: 3 }),
    grn_qty: numeric("grn_qty", { precision: 12, scale: 3 }).notNull().default("0"),
    base_uom: text("base_uom").notNull().default(""),
    purchase_uom: text("purchase_uom"),
    purchase_to_base_factor: numeric("purchase_to_base_factor", { precision: 12, scale: 6 })
      .notNull()
      .default("1"),
    storage_location: text("storage_location"),
    lot_number: text("lot_number").notNull().default(""),
    expiry_date: date("expiry_date"),
    purchase_rate: numeric("purchase_rate", { precision: 12, scale: 4 }).notNull().default("0"),
    line_remarks: text("line_remarks"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_inventory_grn_lines_grn").on(t.iq_tenant_id, t.grn_id, t.sort_order),
    foreignKey({
      name: "inventory_grn_lines_grn_fk",
      columns: [t.iq_tenant_id, t.grn_id],
      foreignColumns: [inventoryGrns.iq_tenant_id, inventoryGrns.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_grn_lines_item_fk",
      columns: [t.iq_tenant_id, t.item_id],
      foreignColumns: [inventoryItems.iq_tenant_id, inventoryItems.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

// ─── Lots & stock ────────────────────────────────────────────────────────────

export const inventoryLots = inventorySchema.table(
  "lots",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    item_id: uuid("item_id").notNull(),
    inventory_store_id: uuid("inventory_store_id"),
    lot_number: text("lot_number").notNull(),
    expiry_date: date("expiry_date"),
    manufacture_date: date("manufacture_date"),
    received_date: date("received_date").notNull(),
    initial_qty: numeric("initial_qty", { precision: 12, scale: 3 }).notNull(),
    unit_cost: numeric("unit_cost", { precision: 12, scale: 4 }),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "inventory_lots_item_fk",
      columns: [t.iq_tenant_id, t.item_id],
      foreignColumns: [inventoryItems.iq_tenant_id, inventoryItems.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_lots_store_fk",
      columns: [t.iq_tenant_id, t.inventory_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

export const inventoryStock = inventorySchema.table(
  "stock",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    item_id: uuid("item_id").notNull(),
    inventory_store_id: uuid("inventory_store_id").notNull(),
    lot_id: uuid("lot_id"),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("0"),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inventory_stock_tenant_item_store_lot").on(
      t.iq_tenant_id,
      t.item_id,
      t.inventory_store_id,
      t.lot_id,
    ),
    index("idx_inventory_stock_tenant_store").on(t.iq_tenant_id, t.inventory_store_id),
    foreignKey({
      name: "inventory_stock_item_fk",
      columns: [t.iq_tenant_id, t.item_id],
      foreignColumns: [inventoryItems.iq_tenant_id, inventoryItems.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_stock_store_fk",
      columns: [t.iq_tenant_id, t.inventory_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_stock_lot_fk",
      columns: [t.iq_tenant_id, t.lot_id],
      foreignColumns: [inventoryLots.iq_tenant_id, inventoryLots.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
  ],
);

export const inventoryStockAdjustments = inventorySchema.table(
  "stock_adjustments",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    stock_id: uuid("stock_id").notNull(),
    item_id: uuid("item_id").notNull(),
    inventory_store_id: uuid("inventory_store_id").notNull(),
    lot_id: uuid("lot_id"),
    delta: numeric("delta", { precision: 12, scale: 3 }).notNull(),
    quantity_before: numeric("quantity_before", { precision: 12, scale: 3 }).notNull(),
    quantity_after: numeric("quantity_after", { precision: 12, scale: 3 }).notNull(),
    reason: text("reason").notNull(),
    created_by: uuid("created_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_inventory_stock_adjustments_tenant_store_created").on(
      t.iq_tenant_id,
      t.inventory_store_id,
      t.created_at,
    ),
  ],
);

// ─── Indents ─────────────────────────────────────────────────────────────────

export const inventoryIndents = inventorySchema.table(
  "indents",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    indent_number: text("indent_number").notNull(),
    indent_date: date("indent_date").notNull(),
    from_store_id: uuid("from_store_id").notNull(),
    to_store_id: uuid("to_store_id"),
    indent_type: text("indent_type").notNull().default("store_transfer"),
    priority: text("priority").notNull().default("normal"),
    remarks: text("remarks"),
    status: text("status").notNull().default("draft"),
    fulfillment_route: text("fulfillment_route").notNull().default("stock_transfer"),
    purchase_indent_number: text("purchase_indent_number"),
    rejection_reason: text("rejection_reason"),
    approval_remarks: text("approval_remarks"),
    inventory_stock_transfer_id: uuid("inventory_stock_transfer_id"),
    inventory_purchase_request_id: uuid("inventory_purchase_request_id"),
    inventory_grn_id: uuid("inventory_grn_id"),
    created_by: uuid("created_by"),
    submitted_at: timestamp("submitted_at", { withTimezone: true }),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    approved_by: uuid("approved_by"),
    fulfilled_at: timestamp("fulfilled_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inventory_indents_tenant_number").on(t.iq_tenant_id, t.indent_number),
    index("idx_inventory_indents_tenant_status_date").on(
      t.iq_tenant_id,
      t.status,
      t.indent_date,
    ),
    index("idx_inventory_indents_tenant_from_store").on(t.iq_tenant_id, t.from_store_id),
    index("idx_inventory_indents_tenant_to_store").on(t.iq_tenant_id, t.to_store_id),
    foreignKey({
      name: "inventory_indents_from_store_fk",
      columns: [t.iq_tenant_id, t.from_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_indents_to_store_fk",
      columns: [t.iq_tenant_id, t.to_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_indents_grn_fk",
      columns: [t.iq_tenant_id, t.inventory_grn_id],
      foreignColumns: [inventoryGrns.iq_tenant_id, inventoryGrns.id],
    })
      .onDelete("set null")
      .onUpdate("no action"),
  ],
);

export const inventoryIndentLines = inventorySchema.table(
  "indent_lines",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    indent_id: uuid("indent_id").notNull(),
    item_id: uuid("item_id").notNull(),
    requested_qty: numeric("requested_qty", { precision: 12, scale: 3 }).notNull(),
    approved_qty: numeric("approved_qty", { precision: 12, scale: 3 }),
    line_remarks: text("line_remarks"),
    preferred_lot_id: uuid("preferred_lot_id"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_inventory_indent_lines_indent").on(t.iq_tenant_id, t.indent_id, t.sort_order),
    foreignKey({
      name: "inventory_indent_lines_indent_fk",
      columns: [t.iq_tenant_id, t.indent_id],
      foreignColumns: [inventoryIndents.iq_tenant_id, inventoryIndents.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_indent_lines_item_fk",
      columns: [t.iq_tenant_id, t.item_id],
      foreignColumns: [inventoryItems.iq_tenant_id, inventoryItems.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_indent_lines_preferred_lot_fk",
      columns: [t.iq_tenant_id, t.preferred_lot_id],
      foreignColumns: [inventoryLots.iq_tenant_id, inventoryLots.id],
    })
      .onDelete("set null")
      .onUpdate("no action"),
  ],
);

// ─── Stock transfers ─────────────────────────────────────────────────────────

export const inventoryStockTransferSequences = inventorySchema.table(
  "stock_transfer_sequences",
  {
    ...tenantColumn(),
    period_key: text("period_key").notNull(),
    last_value: integer("last_value").notNull().default(0),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.period_key] })],
);

export const inventoryStockTransfers = inventorySchema.table(
  "stock_transfers",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    transfer_number: text("transfer_number").notNull(),
    transfer_date: date("transfer_date").notNull(),
    from_store_id: uuid("from_store_id").notNull(),
    to_store_id: uuid("to_store_id").notNull(),
    transfer_type: text("transfer_type").notNull().default("normal"),
    status: text("status").notNull().default("draft"),
    remarks: text("remarks"),
    inventory_indent_id: uuid("inventory_indent_id"),
    created_by: uuid("created_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inventory_stock_transfers_tenant_number").on(
      t.iq_tenant_id,
      t.transfer_number,
    ),
    index("idx_inventory_stock_transfers_tenant_date").on(t.iq_tenant_id, t.transfer_date),
    index("idx_inventory_stock_transfers_tenant_indent").on(t.iq_tenant_id, t.inventory_indent_id),
    foreignKey({
      name: "inventory_stock_transfers_from_store_fk",
      columns: [t.iq_tenant_id, t.from_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_stock_transfers_to_store_fk",
      columns: [t.iq_tenant_id, t.to_store_id],
      foreignColumns: [inventoryStores.iq_tenant_id, inventoryStores.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_stock_transfers_indent_fk",
      columns: [t.iq_tenant_id, t.inventory_indent_id],
      foreignColumns: [inventoryIndents.iq_tenant_id, inventoryIndents.id],
    })
      .onDelete("set null")
      .onUpdate("no action"),
  ],
);

export const inventoryStockTransferLines = inventorySchema.table(
  "stock_transfer_lines",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    stock_transfer_id: uuid("stock_transfer_id").notNull(),
    item_id: uuid("item_id").notNull(),
    transfer_qty: numeric("transfer_qty", { precision: 12, scale: 3 }).notNull(),
    received_qty: numeric("received_qty", { precision: 12, scale: 3 }),
    accepted_qty: numeric("accepted_qty", { precision: 12, scale: 3 }),
    rejected_qty: numeric("rejected_qty", { precision: 12, scale: 3 }),
    rejection_reason: text("rejection_reason"),
    line_remarks: text("line_remarks"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_inventory_stock_transfer_lines_transfer").on(
      t.iq_tenant_id,
      t.stock_transfer_id,
      t.sort_order,
    ),
    foreignKey({
      name: "inventory_stock_transfer_lines_transfer_fk",
      columns: [t.iq_tenant_id, t.stock_transfer_id],
      foreignColumns: [inventoryStockTransfers.iq_tenant_id, inventoryStockTransfers.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "inventory_stock_transfer_lines_item_fk",
      columns: [t.iq_tenant_id, t.item_id],
      foreignColumns: [inventoryItems.iq_tenant_id, inventoryItems.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

export const inventoryStockTransferAllocations = inventorySchema.table(
  "stock_transfer_allocations",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    stock_transfer_line_id: uuid("stock_transfer_line_id").notNull(),
    source_stock_id: uuid("source_stock_id").notNull(),
    lot_id: uuid("lot_id"),
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
    accepted_qty: numeric("accepted_qty", { precision: 12, scale: 3 }).notNull().default("0"),
    returned_qty: numeric("returned_qty", { precision: 12, scale: 3 }).notNull().default("0"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_inventory_stock_transfer_allocations_line").on(
      t.iq_tenant_id,
      t.stock_transfer_line_id,
      t.sort_order,
    ),
    foreignKey({
      name: "inventory_stock_transfer_allocations_line_fk",
      columns: [t.iq_tenant_id, t.stock_transfer_line_id],
      foreignColumns: [inventoryStockTransferLines.iq_tenant_id, inventoryStockTransferLines.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
  ],
);
