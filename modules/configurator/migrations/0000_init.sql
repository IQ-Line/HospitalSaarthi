CREATE SCHEMA "configurator";
--> statement-breakpoint
CREATE TABLE "configurator"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"contact_email" text,
	"website" text,
	"contact_phone" text,
	"address" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "chk_organizations_type" CHECK ("configurator"."organizations"."type" IN ('hospital_chain', 'medical_college', 'standalone_hospital', 'government_network')),
	CONSTRAINT "chk_organizations_status" CHECK ("configurator"."organizations"."status" IN ('active', 'suspended', 'decommissioned'))
);
--> statement-breakpoint
CREATE TABLE "configurator"."sequence_configuration" (
	"iq_tenant_id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'default' NOT NULL,
	"configured_at" timestamp with time zone,
	"identifier_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "chk_sequence_configuration_status" CHECK ("configurator"."sequence_configuration"."status" IN ('default', 'configured'))
);
--> statement-breakpoint
CREATE TABLE "configurator"."tenant_api_keys" (
	"api_key_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"label" text,
	"purpose" text DEFAULT 'opd_slip' NOT NULL,
	"environment" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "chk_tenant_api_keys_purpose" CHECK ("configurator"."tenant_api_keys"."purpose" IN ('opd_slip')),
	CONSTRAINT "chk_tenant_api_keys_environment" CHECK ("configurator"."tenant_api_keys"."environment" IN ('live', 'test')),
	CONSTRAINT "chk_tenant_api_keys_status" CHECK ("configurator"."tenant_api_keys"."status" IN ('active', 'disabled', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "configurator"."tenant_integration_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iq_tenant_id" uuid NOT NULL,
	"integration_kind" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"hip_id" text NOT NULL,
	"hiu_id" text NOT NULL,
	"cm_id" text DEFAULT 'sbx' NOT NULL,
	"client_id" text,
	"client_secret" text,
	"default_sms_phone" text,
	"hip_display_name" text,
	"callback_base_url" text,
	"sms_provider" text,
	"sms_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gateway_environment" text DEFAULT 'sandbox' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "chk_tenant_integration_profiles_kind" CHECK ("configurator"."tenant_integration_profiles"."integration_kind" IN ('abdm'))
);
--> statement-breakpoint
CREATE TABLE "configurator"."tenant_modules" (
	"iq_tenant_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_core_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "tenant_modules_iq_tenant_id_module_id_pk" PRIMARY KEY("iq_tenant_id","module_id"),
	CONSTRAINT "chk_tenant_modules_core_always_active" CHECK (NOT ("configurator"."tenant_modules"."is_core_override" AND NOT "configurator"."tenant_modules"."is_active"))
);
--> statement-breakpoint
CREATE TABLE "configurator"."tenants" (
	"iq_tenant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"parent_tenant_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"provisioning_status" text DEFAULT 'provisioning' NOT NULL,
	"data_isolation_level" text DEFAULT 'shared' NOT NULL,
	"cerbos_scope_key" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"locale" text DEFAULT 'en-IN' NOT NULL,
	"metadata" jsonb,
	"branch_code" text,
	"branch_type" text,
	"address_line1" text,
	"city" text,
	"state" text,
	"pin_code" text,
	"contact_phone" text,
	"contact_email" text,
	"tenant_numeric_code" text,
	"free_follow_up_days" smallint DEFAULT 15 NOT NULL,
	"free_follow_up_visits" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "chk_tenants_type" CHECK ("configurator"."tenants"."type" IN ('full_platform', 'fragmented', 'lite')),
	CONSTRAINT "chk_tenants_provisioning_status" CHECK ("configurator"."tenants"."provisioning_status" IN ('provisioning', 'active', 'suspended', 'decommissioned')),
	CONSTRAINT "chk_tenants_data_isolation_level" CHECK ("configurator"."tenants"."data_isolation_level" IN ('shared', 'isolated')),
	CONSTRAINT "chk_tenants_branch_type" CHECK ("configurator"."tenants"."branch_type" IS NULL OR "configurator"."tenants"."branch_type" IN ('hub_lab', 'hub', 'satellite'))
);
--> statement-breakpoint
ALTER TABLE "configurator"."sequence_configuration" ADD CONSTRAINT "sequence_configuration_iq_tenant_id_tenants_iq_tenant_id_fk" FOREIGN KEY ("iq_tenant_id") REFERENCES "configurator"."tenants"("iq_tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_slug" ON "configurator"."organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_organizations_status" ON "configurator"."organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sequence_configuration_status" ON "configurator"."sequence_configuration" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_api_keys_prefix" ON "configurator"."tenant_api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_tenant_api_keys_tenant" ON "configurator"."tenant_api_keys" USING btree ("iq_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_api_keys_tenant_status" ON "configurator"."tenant_api_keys" USING btree ("iq_tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_integration_profiles_tenant_kind" ON "configurator"."tenant_integration_profiles" USING btree ("iq_tenant_id","integration_kind");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_integration_profiles_hip_active" ON "configurator"."tenant_integration_profiles" USING btree ("hip_id") WHERE "configurator"."tenant_integration_profiles"."integration_kind" = 'abdm' AND "configurator"."tenant_integration_profiles"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_tenant_integration_profiles_tenant" ON "configurator"."tenant_integration_profiles" USING btree ("iq_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_modules_active" ON "configurator"."tenant_modules" USING btree ("iq_tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenants_slug" ON "configurator"."tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tenants_org" ON "configurator"."tenants" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_tenants_parent" ON "configurator"."tenants" USING btree ("parent_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "configurator"."tenants" USING btree ("provisioning_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenants_cerbos_scope" ON "configurator"."tenants" USING btree ("cerbos_scope_key");