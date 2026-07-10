CREATE TABLE "integration_hub"."abdm_share_token_issuances" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"facility_id_ref" text NOT NULL,
	"issue_date" date DEFAULT (current_date at time zone 'Asia/Kolkata')::date NOT NULL,
	"token_number" integer NOT NULL,
	"patient_id" uuid,
	"abha_address" text NOT NULL,
	"profile_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeemed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "abdm_share_token_issuances_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_share_token_issuance" UNIQUE("iq_tenant_id","facility_id_ref","issue_date","token_number")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_share_tokens" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"facility_id_ref" text NOT NULL,
	"issue_date" date DEFAULT (current_date at time zone 'Asia/Kolkata')::date NOT NULL,
	"next_token_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_share_tokens_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_share_token_per_facility_day" UNIQUE("iq_tenant_id","facility_id_ref","issue_date")
);
--> statement-breakpoint
CREATE INDEX "idx_share_issuance_abha" ON "integration_hub"."abdm_share_token_issuances" USING btree ("iq_tenant_id","abha_address");--> statement-breakpoint
CREATE INDEX "idx_share_issuance_active" ON "integration_hub"."abdm_share_token_issuances" USING btree ("iq_tenant_id","facility_id_ref","issue_date","active") WHERE "integration_hub"."abdm_share_token_issuances"."redeemed_at" is null;