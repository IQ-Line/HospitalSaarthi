CREATE SCHEMA "empi";
--> statement-breakpoint
CREATE TABLE "empi"."match_candidates" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_a_id" uuid NOT NULL,
	"patient_b_id" uuid NOT NULL,
	"match_score" numeric(5, 4) NOT NULL,
	"match_algorithm" text NOT NULL,
	"blocking_keys_matched" text[],
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_candidates_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "empi"."merge_history" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"surviving_patient_id" uuid NOT NULL,
	"merged_patient_id" uuid NOT NULL,
	"merge_reason" text,
	"pre_merge_snapshot" jsonb NOT NULL,
	"merged_by" uuid NOT NULL,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unmerged_at" timestamp with time zone,
	"unmerged_by" uuid,
	CONSTRAINT "merge_history_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "empi"."patient_addresses" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"address_type" text NOT NULL,
	"street" text,
	"city" text,
	"district" text,
	"state" text,
	"pincode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "patient_addresses_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "empi"."patient_identifiers" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_value" text NOT NULL,
	"issuing_system" text,
	"source_record_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "patient_identifiers_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_identifiers_type_value" UNIQUE("iq_tenant_id","identifier_type","identifier_value")
);
--> statement-breakpoint
CREATE TABLE "empi"."patient_source_records" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_reference" text,
	"demographics_snapshot" jsonb NOT NULL,
	"contributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contributed_by" uuid,
	CONSTRAINT "patient_source_records_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "empi"."patients" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"uhid" text NOT NULL,
	"abha_number" text,
	"salutation" text,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text,
	"full_name" text NOT NULL,
	"father_name" text,
	"mother_name" text,
	"date_of_birth" date,
	"year_of_birth" smallint,
	"age_years" smallint,
	"age_months" smallint,
	"age_days" smallint,
	"gender" text NOT NULL,
	"phone_number" text NOT NULL,
	"alternate_phone" text,
	"blood_group" text,
	"occupation" text,
	"nationality" text DEFAULT 'Indian' NOT NULL,
	"education" text,
	"emergency_contact_name" text,
	"emergency_contact_relationship" text,
	"emergency_contact_phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"registered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "patients_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_patients_tenant_uhid" UNIQUE("iq_tenant_id","uhid"),
	CONSTRAINT "uq_patients_tenant_abha" UNIQUE("iq_tenant_id","abha_number")
);
--> statement-breakpoint
CREATE TABLE "empi"."sequence_counters" (
	"iq_tenant_id" uuid NOT NULL,
	"sequence_name" text NOT NULL,
	"current_value" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "sequence_counters_iq_tenant_id_sequence_name_pk" PRIMARY KEY("iq_tenant_id","sequence_name")
);
--> statement-breakpoint
CREATE INDEX "idx_match_candidates_pending" ON "empi"."match_candidates" USING btree ("iq_tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_merge_history_surviving" ON "empi"."merge_history" USING btree ("iq_tenant_id","surviving_patient_id");--> statement-breakpoint
CREATE INDEX "idx_merge_history_merged" ON "empi"."merge_history" USING btree ("iq_tenant_id","merged_patient_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_patient" ON "empi"."patient_addresses" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_identifiers_patient" ON "empi"."patient_identifiers" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_source_records_patient" ON "empi"."patient_source_records" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_patients_phone" ON "empi"."patients" USING btree ("iq_tenant_id","phone_number");--> statement-breakpoint
CREATE INDEX "idx_patients_fullname_trgm" ON "empi"."patients" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_patients_status" ON "empi"."patients" USING btree ("iq_tenant_id","status");