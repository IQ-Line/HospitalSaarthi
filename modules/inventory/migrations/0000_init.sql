CREATE SCHEMA "inventory";
--> statement-breakpoint
CREATE TABLE "inventory"."grn_lines" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"grn_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"pr_line_id" uuid,
	"requested_qty" numeric(12, 3),
	"grn_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"base_uom" text DEFAULT '' NOT NULL,
	"purchase_uom" text,
	"purchase_to_base_factor" numeric(12, 6) DEFAULT '1' NOT NULL,
	"storage_location" text,
	"lot_number" text DEFAULT '' NOT NULL,
	"expiry_date" date,
	"purchase_rate" numeric(12, 4) DEFAULT '0' NOT NULL,
	"line_remarks" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grn_lines_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "grn_lines_purchase_to_base_factor_positive_chk" CHECK (purchase_to_base_factor > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."grns" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"grn_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"grn_type" text DEFAULT 'purchase' NOT NULL,
	"grn_date" date NOT NULL,
	"inventory_store_id" uuid NOT NULL,
	"manufacturer_id" uuid,
	"purchase_request_id" uuid,
	"inventory_indent_id" uuid,
	"voucher_invoice_no" text DEFAULT '' NOT NULL,
	"register_page_no" text,
	"remarks" text,
	"shipment_document_path" text,
	"voucher_document_path" text,
	"created_by" uuid,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grns_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "grns_status_chk" CHECK (status in ('draft', 'submitted')),
	CONSTRAINT "grns_type_chk" CHECK (grn_type in ('purchase', 'transfer')),
	CONSTRAINT "grns_remarks_len_chk" CHECK (remarks is null or char_length(remarks) <= 250)
);
--> statement-breakpoint
CREATE TABLE "inventory"."indent_lines" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"indent_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"requested_qty" numeric(12, 3) NOT NULL,
	"approved_qty" numeric(12, 3),
	"line_remarks" text,
	"preferred_lot_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indent_lines_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "indent_lines_requested_qty_positive_chk" CHECK (requested_qty > 0),
	CONSTRAINT "indent_lines_approved_le_requested_chk" CHECK (approved_qty is null or approved_qty <= requested_qty),
	CONSTRAINT "indent_lines_approved_positive_chk" CHECK (approved_qty is null or approved_qty >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."indent_sequences" (
	"iq_tenant_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indent_sequences_iq_tenant_id_period_key_pk" PRIMARY KEY("iq_tenant_id","period_key")
);
--> statement-breakpoint
CREATE TABLE "inventory"."indents" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"indent_number" text NOT NULL,
	"indent_date" date NOT NULL,
	"from_store_id" uuid NOT NULL,
	"to_store_id" uuid,
	"indent_type" text DEFAULT 'store_transfer' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"remarks" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"fulfillment_route" text DEFAULT 'stock_transfer' NOT NULL,
	"purchase_indent_number" text,
	"rejection_reason" text,
	"approval_remarks" text,
	"inventory_stock_transfer_id" uuid,
	"inventory_purchase_request_id" uuid,
	"inventory_grn_id" uuid,
	"created_by" uuid,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indents_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "indents_type_chk" CHECK (indent_type in ('store_transfer', 'pharmacy_refill', 'emergency')),
	CONSTRAINT "indents_priority_chk" CHECK (priority in ('normal', 'urgent', 'stat')),
	CONSTRAINT "indents_status_chk" CHECK (status in ('draft', 'submitted', 'approved', 'partially_approved', 'rejected', 'in_fulfillment', 'fulfilled')),
	CONSTRAINT "indents_fulfillment_route_chk" CHECK (fulfillment_route in ('stock_transfer', 'procurement')),
	CONSTRAINT "indents_distinct_stores_chk" CHECK (to_store_id is null or from_store_id <> to_store_id),
	CONSTRAINT "indents_remarks_len_chk" CHECK (remarks is null or char_length(remarks) <= 2000),
	CONSTRAINT "indents_reject_len_chk" CHECK (rejection_reason is null or char_length(rejection_reason) <= 2000),
	CONSTRAINT "indents_date_not_future_chk" CHECK (indent_date <= CURRENT_DATE),
	CONSTRAINT "indents_purchase_indent_len_chk" CHECK (purchase_indent_number is null or char_length(trim(purchase_indent_number)) <= 120)
);
--> statement-breakpoint
CREATE TABLE "inventory"."item_code_sequences" (
	"iq_tenant_id" uuid NOT NULL,
	"item_type_id" uuid NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "item_code_sequences_iq_tenant_id_item_type_id_pk" PRIMARY KEY("iq_tenant_id","item_type_id"),
	CONSTRAINT "item_code_sequences_last_sequence_nonneg_chk" CHECK (last_sequence >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."items" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"item_classification" text DEFAULT 'inventory' NOT NULL,
	"item_code" text NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"category_id" uuid,
	"sub_category_id" uuid,
	"item_type_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"catalog_version" integer DEFAULT 1 NOT NULL,
	"tenant_formulary_id" uuid,
	"platform_medicine_id" uuid,
	"manufacturer_id" uuid,
	"manufacturer_item_code" text,
	"catalog_number" text,
	"hsn_gst_id" uuid,
	"purchase_uom_id" uuid NOT NULL,
	"consumption_uom_id" uuid NOT NULL,
	"sale_uom_id" uuid NOT NULL,
	"conversion_factor" numeric(18, 6) DEFAULT '1' NOT NULL,
	"tracking_mode" text DEFAULT 'lot' NOT NULL,
	"is_expirable" boolean DEFAULT false NOT NULL,
	"is_short_expiry_monitoring" boolean DEFAULT false NOT NULL,
	"loose_sale_allowed" boolean DEFAULT false NOT NULL,
	"reorder_point" numeric(12, 3) DEFAULT '0' NOT NULL,
	"storage_condition_id" uuid,
	"pack_size" text,
	"length_cm" numeric(10, 2),
	"width_cm" numeric(10, 2),
	"height_cm" numeric(10, 2),
	"weight_kg" numeric(10, 3),
	"item_image_url" text,
	"supporting_document_url" text,
	"unit_of_measure" text NOT NULL,
	"storage_conditions" text,
	"description" text,
	"supply_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_lot_tracked" boolean DEFAULT true NOT NULL,
	"is_serial_tracked" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "items_item_classification_chk" CHECK (item_classification in ('inventory', 'medicine')),
	CONSTRAINT "items_tracking_mode_chk" CHECK (tracking_mode in ('none', 'lot', 'serial')),
	CONSTRAINT "items_classification_formulary_chk" CHECK ((item_classification = 'medicine' and tenant_formulary_id is not null) or (item_classification = 'inventory' and tenant_formulary_id is null)),
	CONSTRAINT "items_medicine_tracking_chk" CHECK (item_classification <> 'medicine' or (tracking_mode = 'lot' and is_expirable = true)),
	CONSTRAINT "items_conversion_factor_positive_chk" CHECK (conversion_factor > 0),
	CONSTRAINT "items_category_pair_chk" CHECK (sub_category_id is null or category_id is not null)
);
--> statement-breakpoint
CREATE TABLE "inventory"."lots" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"inventory_store_id" uuid,
	"lot_number" text NOT NULL,
	"expiry_date" date,
	"manufacture_date" date,
	"received_date" date NOT NULL,
	"initial_qty" numeric(12, 3) NOT NULL,
	"unit_cost" numeric(12, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lots_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."stock" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"inventory_store_id" uuid NOT NULL,
	"lot_id" uuid,
	"quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."stock_transfer_lines" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"stock_transfer_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"transfer_qty" numeric(12, 3) NOT NULL,
	"line_remarks" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfer_lines_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "stock_transfer_lines_qty_chk" CHECK (transfer_qty > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."stock_transfer_sequences" (
	"iq_tenant_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfer_sequences_iq_tenant_id_period_key_pk" PRIMARY KEY("iq_tenant_id","period_key")
);
--> statement-breakpoint
CREATE TABLE "inventory"."stock_transfers" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"transfer_number" text NOT NULL,
	"transfer_date" date NOT NULL,
	"from_store_id" uuid NOT NULL,
	"to_store_id" uuid NOT NULL,
	"transfer_type" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"remarks" text,
	"inventory_indent_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfers_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "stock_transfers_type_chk" CHECK (transfer_type in ('normal', 'emergency')),
	CONSTRAINT "stock_transfers_status_chk" CHECK (status in ('draft', 'in_transit', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "inventory"."store_code_sequences" (
	"iq_tenant_id" uuid NOT NULL,
	"store_type_id" uuid NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "store_code_sequences_iq_tenant_id_store_type_id_pk" PRIMARY KEY("iq_tenant_id","store_type_id"),
	CONSTRAINT "store_code_sequences_last_sequence_nonneg_chk" CHECK (last_sequence >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."stores" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"store_code" text NOT NULL,
	"store_name" text NOT NULL,
	"store_type_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"department_id" uuid,
	"physical_location" text DEFAULT '' NOT NULL,
	"can_receive_stock" boolean DEFAULT false NOT NULL,
	"can_dispense" boolean DEFAULT false NOT NULL,
	"can_issue_to_ward" boolean DEFAULT false NOT NULL,
	"track_batch_expiry" boolean DEFAULT true NOT NULL,
	"indent_authority" boolean DEFAULT false NOT NULL,
	"indent_target_store_id" uuid,
	"is_central_store" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "inventory"."grn_lines" ADD CONSTRAINT "inventory_grn_lines_grn_fk" FOREIGN KEY ("iq_tenant_id","grn_id") REFERENCES "inventory"."grns"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."grn_lines" ADD CONSTRAINT "inventory_grn_lines_item_fk" FOREIGN KEY ("iq_tenant_id","item_id") REFERENCES "inventory"."items"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."grns" ADD CONSTRAINT "inventory_grns_store_fk" FOREIGN KEY ("iq_tenant_id","inventory_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."indent_lines" ADD CONSTRAINT "inventory_indent_lines_indent_fk" FOREIGN KEY ("iq_tenant_id","indent_id") REFERENCES "inventory"."indents"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."indent_lines" ADD CONSTRAINT "inventory_indent_lines_item_fk" FOREIGN KEY ("iq_tenant_id","item_id") REFERENCES "inventory"."items"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."indent_lines" ADD CONSTRAINT "inventory_indent_lines_preferred_lot_fk" FOREIGN KEY ("iq_tenant_id","preferred_lot_id") REFERENCES "inventory"."lots"("iq_tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."indents" ADD CONSTRAINT "inventory_indents_from_store_fk" FOREIGN KEY ("iq_tenant_id","from_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."indents" ADD CONSTRAINT "inventory_indents_to_store_fk" FOREIGN KEY ("iq_tenant_id","to_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."indents" ADD CONSTRAINT "inventory_indents_grn_fk" FOREIGN KEY ("iq_tenant_id","inventory_grn_id") REFERENCES "inventory"."grns"("iq_tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."lots" ADD CONSTRAINT "inventory_lots_item_fk" FOREIGN KEY ("iq_tenant_id","item_id") REFERENCES "inventory"."items"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."lots" ADD CONSTRAINT "inventory_lots_store_fk" FOREIGN KEY ("iq_tenant_id","inventory_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock" ADD CONSTRAINT "inventory_stock_item_fk" FOREIGN KEY ("iq_tenant_id","item_id") REFERENCES "inventory"."items"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock" ADD CONSTRAINT "inventory_stock_store_fk" FOREIGN KEY ("iq_tenant_id","inventory_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock" ADD CONSTRAINT "inventory_stock_lot_fk" FOREIGN KEY ("iq_tenant_id","lot_id") REFERENCES "inventory"."lots"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_lines" ADD CONSTRAINT "inventory_stock_transfer_lines_transfer_fk" FOREIGN KEY ("iq_tenant_id","stock_transfer_id") REFERENCES "inventory"."stock_transfers"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_lines" ADD CONSTRAINT "inventory_stock_transfer_lines_item_fk" FOREIGN KEY ("iq_tenant_id","item_id") REFERENCES "inventory"."items"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfers" ADD CONSTRAINT "inventory_stock_transfers_from_store_fk" FOREIGN KEY ("iq_tenant_id","from_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfers" ADD CONSTRAINT "inventory_stock_transfers_to_store_fk" FOREIGN KEY ("iq_tenant_id","to_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfers" ADD CONSTRAINT "inventory_stock_transfers_indent_fk" FOREIGN KEY ("iq_tenant_id","inventory_indent_id") REFERENCES "inventory"."indents"("iq_tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stores" ADD CONSTRAINT "inventory_stores_indent_target_store_fk" FOREIGN KEY ("iq_tenant_id","indent_target_store_id") REFERENCES "inventory"."stores"("iq_tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inventory_grn_lines_grn" ON "inventory"."grn_lines" USING btree ("iq_tenant_id","grn_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_grns_tenant_number" ON "inventory"."grns" USING btree ("iq_tenant_id","grn_number");--> statement-breakpoint
CREATE INDEX "idx_inventory_grns_tenant_status_date" ON "inventory"."grns" USING btree ("iq_tenant_id","status","grn_date" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_grns_manufacturer_invoice_submitted" ON "inventory"."grns" USING btree ("iq_tenant_id","manufacturer_id",lower(btrim("voucher_invoice_no"))) WHERE "inventory"."grns"."status" = 'submitted' and "inventory"."grns"."grn_type" = 'purchase' and "inventory"."grns"."manufacturer_id" is not null and length(btrim("inventory"."grns"."voucher_invoice_no")) > 0;--> statement-breakpoint
CREATE INDEX "idx_inventory_grns_tenant_indent" ON "inventory"."grns" USING btree ("iq_tenant_id","inventory_indent_id") WHERE "inventory"."grns"."inventory_indent_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_inventory_indent_lines_indent" ON "inventory"."indent_lines" USING btree ("iq_tenant_id","indent_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_indents_tenant_number" ON "inventory"."indents" USING btree ("iq_tenant_id","indent_number");--> statement-breakpoint
CREATE INDEX "idx_inventory_indents_tenant_status_date" ON "inventory"."indents" USING btree ("iq_tenant_id","status","indent_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_inventory_indents_tenant_from_store" ON "inventory"."indents" USING btree ("iq_tenant_id","from_store_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_indents_tenant_to_store" ON "inventory"."indents" USING btree ("iq_tenant_id","to_store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_items_tenant_item_code" ON "inventory"."items" USING btree ("iq_tenant_id","item_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_items_tenant_formulary" ON "inventory"."items" USING btree ("iq_tenant_id","tenant_formulary_id") WHERE "inventory"."items"."tenant_formulary_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_inventory_items_tenant_classification" ON "inventory"."items" USING btree ("iq_tenant_id","item_classification");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_tenant_active" ON "inventory"."items" USING btree ("iq_tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_category" ON "inventory"."items" USING btree ("iq_tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_item_type" ON "inventory"."items" USING btree ("iq_tenant_id","item_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_lots_tenant_item_store_lot" ON "inventory"."lots" USING btree ("iq_tenant_id","item_id","inventory_store_id",lower(btrim("lot_number"))) WHERE "inventory"."lots"."inventory_store_id" is not null and length(btrim("inventory"."lots"."lot_number")) > 0;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_stock_tenant_item_store_lot" ON "inventory"."stock" USING btree ("iq_tenant_id","item_id","inventory_store_id","lot_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_stock_tenant_store" ON "inventory"."stock" USING btree ("iq_tenant_id","inventory_store_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_stock_transfer_lines_transfer" ON "inventory"."stock_transfer_lines" USING btree ("iq_tenant_id","stock_transfer_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_stock_transfers_tenant_number" ON "inventory"."stock_transfers" USING btree ("iq_tenant_id","transfer_number");--> statement-breakpoint
CREATE INDEX "idx_inventory_stock_transfers_tenant_date" ON "inventory"."stock_transfers" USING btree ("iq_tenant_id","transfer_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_inventory_stock_transfers_tenant_indent" ON "inventory"."stock_transfers" USING btree ("iq_tenant_id","inventory_indent_id") WHERE "inventory"."stock_transfers"."inventory_indent_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_stores_tenant_store_code" ON "inventory"."stores" USING btree ("iq_tenant_id","store_code");--> statement-breakpoint
CREATE INDEX "idx_inventory_stores_tenant_branch" ON "inventory"."stores" USING btree ("iq_tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_stores_tenant_store_type" ON "inventory"."stores" USING btree ("iq_tenant_id","store_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_stores_tenant_central_store" ON "inventory"."stores" USING btree ("iq_tenant_id") WHERE "inventory"."stores"."is_central_store" = true;