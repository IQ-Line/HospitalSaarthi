CREATE SCHEMA "registration";
--> statement-breakpoint
CREATE TABLE "registration"."registration" (
	"registration_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"patient_uhid" text NOT NULL,
	"patient_abha_number" text,
	"patient_abha_address" text,
	"patient_full_name" text NOT NULL,
	"patient_phone_number" text NOT NULL,
	"patient_gender" text,
	"patient_date_of_birth" date,
	"patient_year_of_birth" smallint,
	"patient_source_record_id" uuid NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "registration_iq_tenant_id_registration_id_pk" PRIMARY KEY("iq_tenant_id","registration_id")
);
--> statement-breakpoint
CREATE TABLE "registration"."visit" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"visit_id" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_type" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"facility_id" uuid,
	"department_id" uuid,
	"doctor_id" uuid,
	"appointment_id" uuid,
	"idempotency_key" text,
	"consultation_type" varchar(32) DEFAULT 'new' NOT NULL,
	"is_free_follow_up" boolean DEFAULT false NOT NULL,
	"free_follow_up_visit_count" integer DEFAULT 0 NOT NULL,
	"free_follow_up_valid_till" timestamp with time zone,
	"free_follow_up_details" jsonb,
	"parent_visit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "visit_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE INDEX "idx_registration_patient" ON "registration"."registration" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_registration_uhid" ON "registration"."registration" USING btree ("iq_tenant_id","patient_uhid");--> statement-breakpoint
CREATE INDEX "idx_registration_phone" ON "registration"."registration" USING btree ("iq_tenant_id","patient_phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_registration_idempotency" ON "registration"."registration" USING btree ("iq_tenant_id","idempotency_key") WHERE "registration"."registration"."idempotency_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_registration_patient" ON "registration"."registration" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_visit_tenant_visit_id" ON "registration"."visit" USING btree ("iq_tenant_id","visit_id");--> statement-breakpoint
CREATE INDEX "idx_visit_patient" ON "registration"."visit" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_visit_status" ON "registration"."visit" USING btree ("iq_tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_visit_idempotency" ON "registration"."visit" USING btree ("iq_tenant_id","idempotency_key") WHERE "registration"."visit"."idempotency_key" is not null;