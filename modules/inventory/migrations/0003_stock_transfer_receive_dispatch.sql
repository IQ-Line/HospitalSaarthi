CREATE TABLE "inventory"."stock_transfer_allocations" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"stock_transfer_line_id" uuid NOT NULL,
	"source_stock_id" uuid NOT NULL,
	"lot_id" uuid,
	"qty" numeric(12, 3) NOT NULL,
	"accepted_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"returned_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfer_allocations_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_lines" ADD COLUMN "received_qty" numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_lines" ADD COLUMN "accepted_qty" numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_lines" ADD COLUMN "rejected_qty" numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory"."stock_transfer_lines" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
CREATE INDEX "idx_inventory_stock_transfer_allocations_line" ON "inventory"."stock_transfer_allocations" USING btree ("iq_tenant_id","stock_transfer_line_id","sort_order");
-- NOTE: the stock_transfer_allocations -> stock_transfer_lines FK is created in
-- 0004 AFTER the table is distributed. Citus rejects adding a FK from a still-local
-- table to an already-distributed parent (stock_transfer_lines was distributed in
-- 0001), so the constraint is deferred until both are distributed and colocated —
-- same pattern the cyclic FKs use in 0002.