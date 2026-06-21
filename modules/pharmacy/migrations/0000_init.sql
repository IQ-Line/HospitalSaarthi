CREATE SCHEMA "pharmacy";
--> statement-breakpoint
CREATE TABLE "pharmacy"."dispense_line_items" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"dispense_record_id" uuid NOT NULL,
	"medicine_id" uuid,
	"medicine_display_name" text NOT NULL,
	"prescribed_quantity" numeric(12, 4),
	"quantity_dispensed" numeric(12, 4) DEFAULT '0' NOT NULL,
	"unit_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"line_discount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(8, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispense_line_items_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy"."dispense_records" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"walk_in_order" boolean DEFAULT false NOT NULL,
	"walk_in_patient_id" uuid,
	"visit_id" uuid,
	"patient_id" uuid,
	"opd_prescription_id" uuid,
	"subtotal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"dispense_status" text DEFAULT 'issued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "dispense_records_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy"."opd_queue_projection" (
	"visit_id" uuid NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"doctor_id" uuid,
	"visit_status" text NOT NULL,
	"prescription_status" text NOT NULL,
	"medicine_count" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone NOT NULL,
	"patient_name" text,
	"uhid" text,
	"phone" text,
	"age_years" integer,
	"gender" text,
	"doctor_name" text,
	"formatted_visit_id" text,
	"dispense_status" text DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opd_queue_projection_iq_tenant_id_visit_id_pk" PRIMARY KEY("iq_tenant_id","visit_id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy"."walk_in_patients" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"phone" text,
	"gender" text NOT NULL,
	"date_of_birth" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walk_in_patients_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_dispense_record_fk" FOREIGN KEY ("iq_tenant_id","dispense_record_id") REFERENCES "pharmacy"."dispense_records"("iq_tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_records" ADD CONSTRAINT "dispense_records_walk_in_patient_fk" FOREIGN KEY ("iq_tenant_id","walk_in_patient_id") REFERENCES "pharmacy"."walk_in_patients"("iq_tenant_id","id") ON DELETE restrict ON UPDATE no action;