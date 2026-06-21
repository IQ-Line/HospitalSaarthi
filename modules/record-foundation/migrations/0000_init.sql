CREATE SCHEMA "record_foundation";
--> statement-breakpoint
CREATE TABLE "record_foundation"."bundles" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"care_context_id" uuid NOT NULL,
	"bundle_kind" text NOT NULL,
	"fhir_profile_url" text NOT NULL,
	"fhir_profile_version" text NOT NULL,
	"producer_kind" text NOT NULL,
	"producer_id" text NOT NULL,
	"bundle_json" jsonb NOT NULL,
	"bundle_size_bytes" integer NOT NULL,
	"produced_at" timestamp with time zone NOT NULL,
	"stored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "bundles_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "record_foundation"."care_contexts" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"source_origin" text NOT NULL,
	"source_system_id" text NOT NULL,
	"source_record_type" text NOT NULL,
	"source_record_id" text,
	"encounter_id" uuid,
	"display" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "care_contexts_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_care_contexts_source" UNIQUE("iq_tenant_id","source_origin","source_system_id","source_record_id","source_record_type")
);
--> statement-breakpoint
CREATE INDEX "idx_bundles_care_context" ON "record_foundation"."bundles" USING btree ("iq_tenant_id","care_context_id");--> statement-breakpoint
CREATE INDEX "idx_bundles_kind" ON "record_foundation"."bundles" USING btree ("iq_tenant_id","bundle_kind");--> statement-breakpoint
CREATE INDEX "idx_care_contexts_patient_time" ON "record_foundation"."care_contexts" USING btree ("iq_tenant_id","patient_id","period_start");--> statement-breakpoint
CREATE INDEX "idx_care_contexts_encounter" ON "record_foundation"."care_contexts" USING btree ("iq_tenant_id","encounter_id");