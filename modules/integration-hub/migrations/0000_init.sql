CREATE SCHEMA "integration_hub";
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_consent_artefacts" (
	"iq_tenant_id" uuid NOT NULL,
	"consent_id" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"hip_id" text NOT NULL,
	"hiu_id" text NOT NULL,
	"status" text NOT NULL,
	"data_erase_at" timestamp with time zone NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"artefact_json" jsonb NOT NULL,
	"signature" text NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_consent_artefacts_iq_tenant_id_consent_id_pk" PRIMARY KEY("iq_tenant_id","consent_id")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_inbound_messages" (
	"iq_tenant_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"flow_kind" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_inbound_messages_iq_tenant_id_request_id_pk" PRIMARY KEY("iq_tenant_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_link_otps" (
	"iq_tenant_id" uuid NOT NULL,
	"link_ref_number" text NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_link_otps_iq_tenant_id_link_ref_number_pk" PRIMARY KEY("iq_tenant_id","link_ref_number")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_link_tokens" (
	"iq_tenant_id" uuid NOT NULL,
	"abha_address" text NOT NULL,
	"link_token" text,
	"expires_at" timestamp with time zone,
	"obtained_at" timestamp with time zone,
	"pending_request_id" text,
	"pending_expires_at" timestamp with time zone,
	CONSTRAINT "abdm_link_tokens_iq_tenant_id_abha_address_pk" PRIMARY KEY("iq_tenant_id","abha_address")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_linked_care_contexts" (
	"iq_tenant_id" uuid NOT NULL,
	"abha_address" text NOT NULL,
	"care_context_ref" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_linked_care_contexts_iq_tenant_id_abha_address_care_context_ref_pk" PRIMARY KEY("iq_tenant_id","abha_address","care_context_ref")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_m3_consent_artefacts_hiu" (
	"iq_tenant_id" uuid NOT NULL,
	"consent_id" text NOT NULL,
	"consent_request_id" text NOT NULL,
	"patient_abha_address" text NOT NULL,
	"hip_id" text NOT NULL,
	"status" text NOT NULL,
	"data_erase_at" timestamp with time zone NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"hi_types" text[] NOT NULL,
	"care_contexts" jsonb NOT NULL,
	"artefact_json" jsonb NOT NULL,
	"signature" text NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_m3_consent_artefacts_hiu_iq_tenant_id_consent_id_pk" PRIMARY KEY("iq_tenant_id","consent_id")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_m3_consent_requests" (
	"iq_tenant_id" uuid NOT NULL,
	"consent_request_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"patient_abha_address" text NOT NULL,
	"hip_id" text,
	"purpose_code" text NOT NULL,
	"hi_types" text[] NOT NULL,
	"permission_date_from" timestamp with time zone NOT NULL,
	"permission_date_to" timestamp with time zone NOT NULL,
	"data_erase_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"consent_artefact_ids" text[] DEFAULT '{}' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_m3_consent_requests_iq_tenant_id_consent_request_id_pk" PRIMARY KEY("iq_tenant_id","consent_request_id")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_m3_data_transfers" (
	"iq_tenant_id" uuid NOT NULL,
	"transfer_id" uuid NOT NULL,
	"session_id" uuid,
	"flow_kind" text DEFAULT 'abdm.m3.hiu.v1' NOT NULL,
	"state" text NOT NULL,
	"consent_id" text NOT NULL,
	"outbound_request_id" text,
	"cm_transaction_id" text,
	"hiu_private_key_jwk" text NOT NULL,
	"hiu_public_key_b64" text NOT NULL,
	"hiu_nonce_b64" text NOT NULL,
	"hip_public_key_b64" text,
	"hip_nonce_b64" text,
	"data_push_url" text NOT NULL,
	"bundle_json" jsonb,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"awaiting_push_until" timestamp with time zone,
	CONSTRAINT "abdm_m3_data_transfers_iq_tenant_id_transfer_id_pk" PRIMARY KEY("iq_tenant_id","transfer_id")
);
--> statement-breakpoint
CREATE TABLE "integration_hub"."abdm_sessions" (
	"iq_tenant_id" uuid NOT NULL,
	"session_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"flow_kind" text NOT NULL,
	"state" text NOT NULL,
	"txn_id" text,
	"request_id" text,
	"x_token" text,
	"t_token" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abdm_sessions_iq_tenant_id_session_id_pk" PRIMARY KEY("iq_tenant_id","session_id")
);
--> statement-breakpoint
CREATE INDEX "ix_abdm_consent_patient" ON "integration_hub"."abdm_consent_artefacts" USING btree ("iq_tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "ix_abdm_link_otps_expires" ON "integration_hub"."abdm_link_otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ix_abdm_linked_care_contexts_abha" ON "integration_hub"."abdm_linked_care_contexts" USING btree ("iq_tenant_id","abha_address");--> statement-breakpoint
CREATE INDEX "ix_m3_artefacts_hiu_patient" ON "integration_hub"."abdm_m3_consent_artefacts_hiu" USING btree ("iq_tenant_id","patient_abha_address");--> statement-breakpoint
CREATE INDEX "ix_m3_artefacts_hiu_request" ON "integration_hub"."abdm_m3_consent_artefacts_hiu" USING btree ("iq_tenant_id","consent_request_id");--> statement-breakpoint
CREATE INDEX "ix_m3_consent_requests_session" ON "integration_hub"."abdm_m3_consent_requests" USING btree ("iq_tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "ix_m3_consent_requests_state" ON "integration_hub"."abdm_m3_consent_requests" USING btree ("iq_tenant_id","state");--> statement-breakpoint
CREATE INDEX "ix_m3_transfers_consent" ON "integration_hub"."abdm_m3_data_transfers" USING btree ("iq_tenant_id","consent_id");--> statement-breakpoint
CREATE INDEX "ix_m3_transfers_txn" ON "integration_hub"."abdm_m3_data_transfers" USING btree ("iq_tenant_id","cm_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_abdm_sessions_txn" ON "integration_hub"."abdm_sessions" USING btree ("iq_tenant_id","txn_id");--> statement-breakpoint
CREATE INDEX "idx_abdm_sessions_flow_state" ON "integration_hub"."abdm_sessions" USING btree ("iq_tenant_id","flow_kind","state");