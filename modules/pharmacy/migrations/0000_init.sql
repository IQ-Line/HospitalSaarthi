CREATE SCHEMA "pharmacy";
--> statement-breakpoint
CREATE TABLE "pharmacy"."dispense" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"opd_prescription_id" uuid,
	"department_id" uuid,
	"branch_id" uuid,
	"inventory_store_id" uuid,
	"priority" text DEFAULT 'routine' NOT NULL,
	"subtotal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"dispense_status" text DEFAULT 'issued' NOT NULL,
	"dispense_draft_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "dispense_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy"."dispense_line_items" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"dispense_id" uuid NOT NULL,
	"medicine_id" uuid,
	"medicine_display_name" text NOT NULL,
	"opd_prescription_item_id" uuid,
	"opd_prescription_line_no" integer,
	"prescribed_quantity" numeric(12, 4),
	"quantity_dispensed" numeric(12, 4) DEFAULT '0' NOT NULL,
	"unit_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"line_discount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(8, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"stock_batch_id" uuid,
	"is_substitution" boolean DEFAULT false NOT NULL,
	"substitute_of_line_id" uuid,
	"substitution_reason" text,
	"line_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispense_line_items_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy"."queue_projection" (
	"queue_item_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"source_kind" text DEFAULT 'opd' NOT NULL,
	"source_ref_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"doctor_id" uuid,
	"visit_status" text NOT NULL,
	"prescription_status" text NOT NULL,
	"medicine_count" integer DEFAULT 0 NOT NULL,
	"priority" text DEFAULT 'routine' NOT NULL,
	"queued_at" timestamp with time zone NOT NULL,
	"patient_name" text,
	"uhid" text,
	"phone" text,
	"age_years" integer,
	"gender" text,
	"doctor_name" text,
	"formatted_visit_id" text,
	"dispense_status" text DEFAULT 'pending' NOT NULL,
	"context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_projection_iq_tenant_id_queue_item_id_pk" PRIMARY KEY("iq_tenant_id","queue_item_id")
);
--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_dispense_fk" FOREIGN KEY ("iq_tenant_id","dispense_id") REFERENCES "pharmacy"."dispense"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pharmacy_dispense_tenant_visit" ON "pharmacy"."dispense" USING btree ("iq_tenant_id","visit_id");