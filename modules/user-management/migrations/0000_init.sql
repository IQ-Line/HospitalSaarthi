CREATE SCHEMA "user_management";
--> statement-breakpoint
CREATE TABLE "user_management"."capabilities" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"capability_key" text NOT NULL,
	"module" text NOT NULL,
	"feature" text NOT NULL,
	"action" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_module_slug" text,
	"source_permission_slug" text,
	"source_catalog" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capabilities_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "uq_capabilities_key" UNIQUE("capability_key"),
	CONSTRAINT "uq_capabilities_module_feature_action" UNIQUE("module","feature","action"),
	CONSTRAINT "capabilities_key_not_blank_chk" CHECK (length(btrim("user_management"."capabilities"."capability_key")) > 0),
	CONSTRAINT "capabilities_key_canonical_chk" CHECK ("user_management"."capabilities"."capability_key" = lower(btrim("user_management"."capabilities"."capability_key"))),
	CONSTRAINT "capabilities_module_not_blank_chk" CHECK (length(btrim("user_management"."capabilities"."module")) > 0),
	CONSTRAINT "capabilities_feature_not_blank_chk" CHECK (length(btrim("user_management"."capabilities"."feature")) > 0),
	CONSTRAINT "capabilities_action_not_blank_chk" CHECK (length(btrim("user_management"."capabilities"."action")) > 0),
	CONSTRAINT "capabilities_display_name_not_blank_chk" CHECK (length(btrim("user_management"."capabilities"."display_name")) > 0),
	CONSTRAINT "capabilities_source_catalog_chk" CHECK ("user_management"."capabilities"."source_catalog" is null or "user_management"."capabilities"."source_catalog" in ('master_data'))
);
--> statement-breakpoint
CREATE TABLE "user_management"."delegated_capability_grants" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delegated_capability_grants_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_delegated_grants_tenant_source_target_capability_start" UNIQUE("iq_tenant_id","source_user_id","target_user_id","capability_id","starts_at"),
	CONSTRAINT "delegated_capability_grants_status_chk" CHECK ("user_management"."delegated_capability_grants"."status" in ('pending', 'active', 'revoked', 'expired')),
	CONSTRAINT "delegated_capability_grants_window_chk" CHECK ("user_management"."delegated_capability_grants"."ends_at" is null or "user_management"."delegated_capability_grants"."ends_at" > "user_management"."delegated_capability_grants"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "user_management"."role_capabilities" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_capabilities_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_role_capabilities_tenant_role_capability" UNIQUE("iq_tenant_id","role_id","capability_id")
);
--> statement-breakpoint
CREATE TABLE "user_management"."roles" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"role_type" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_roles_tenant_code" UNIQUE("iq_tenant_id","code"),
	CONSTRAINT "roles_code_not_blank_chk" CHECK (length(btrim("user_management"."roles"."code")) > 0),
	CONSTRAINT "roles_code_canonical_chk" CHECK ("user_management"."roles"."code" = lower(btrim("user_management"."roles"."code"))),
	CONSTRAINT "roles_role_type_not_blank_chk" CHECK (length(btrim("user_management"."roles"."role_type")) > 0),
	CONSTRAINT "roles_role_type_canonical_chk" CHECK ("user_management"."roles"."role_type" = lower(btrim("user_management"."roles"."role_type"))),
	CONSTRAINT "roles_display_name_not_blank_chk" CHECK (length(btrim("user_management"."roles"."display_name")) > 0),
	CONSTRAINT "roles_status_chk" CHECK ("user_management"."roles"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "user_management"."user_capabilities" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"grant_source" text NOT NULL,
	"source_role_id" uuid,
	"granted_by_user_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	CONSTRAINT "user_capabilities_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_user_capabilities_tenant_user_capability" UNIQUE("iq_tenant_id","user_id","capability_id"),
	CONSTRAINT "user_capabilities_grant_source_chk" CHECK ("user_management"."user_capabilities"."grant_source" in ('manual', 'role_template', 'delegated', 'system'))
);
--> statement-breakpoint
CREATE TABLE "user_management"."user_clearances" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"clearance_key" text NOT NULL,
	"clearance_level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_clearances_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_user_clearances_tenant_user_key" UNIQUE("iq_tenant_id","user_id","clearance_key"),
	CONSTRAINT "user_clearances_key_not_blank_chk" CHECK (length(btrim("user_management"."user_clearances"."clearance_key")) > 0),
	CONSTRAINT "user_clearances_level_not_blank_chk" CHECK (length(btrim("user_management"."user_clearances"."clearance_level")) > 0)
);
--> statement-breakpoint
CREATE TABLE "user_management"."user_roles" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by_user_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_user_roles_tenant_user_role" UNIQUE("iq_tenant_id","user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "user_management"."users" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"auth_user_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"username" text,
	"org_id" uuid,
	"department" text,
	"clearance_tier_required" integer DEFAULT 0 NOT NULL,
	"api_key_prefix" text,
	"api_key_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "users_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_users_tenant_username" UNIQUE("iq_tenant_id","username"),
	CONSTRAINT "users_status_chk" CHECK ("user_management"."users"."status" in ('active', 'inactive', 'suspended')),
	CONSTRAINT "users_clearance_tier_chk" CHECK ("user_management"."users"."clearance_tier_required" >= 0 and "user_management"."users"."clearance_tier_required" <= 3)
);
--> statement-breakpoint
ALTER TABLE "user_management"."delegated_capability_grants" ADD CONSTRAINT "fk_delegated_grants_tenant_source_user" FOREIGN KEY ("iq_tenant_id","source_user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."delegated_capability_grants" ADD CONSTRAINT "fk_delegated_grants_tenant_target_user" FOREIGN KEY ("iq_tenant_id","target_user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."delegated_capability_grants" ADD CONSTRAINT "fk_delegated_grants_capability" FOREIGN KEY ("capability_id") REFERENCES "user_management"."capabilities"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."role_capabilities" ADD CONSTRAINT "fk_role_capabilities_tenant_role" FOREIGN KEY ("iq_tenant_id","role_id") REFERENCES "user_management"."roles"("iq_tenant_id","id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."role_capabilities" ADD CONSTRAINT "fk_role_capabilities_capability" FOREIGN KEY ("capability_id") REFERENCES "user_management"."capabilities"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_tenant_user" FOREIGN KEY ("iq_tenant_id","user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_capability" FOREIGN KEY ("capability_id") REFERENCES "user_management"."capabilities"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_tenant_source_role" FOREIGN KEY ("iq_tenant_id","source_role_id") REFERENCES "user_management"."roles"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_tenant_granted_by_user" FOREIGN KEY ("iq_tenant_id","granted_by_user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_tenant_revoked_by_user" FOREIGN KEY ("iq_tenant_id","revoked_by_user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_clearances" ADD CONSTRAINT "fk_user_clearances_tenant_user" FOREIGN KEY ("iq_tenant_id","user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_roles" ADD CONSTRAINT "fk_user_roles_tenant_user" FOREIGN KEY ("iq_tenant_id","user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_roles" ADD CONSTRAINT "fk_user_roles_tenant_role" FOREIGN KEY ("iq_tenant_id","role_id") REFERENCES "user_management"."roles"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_roles" ADD CONSTRAINT "fk_user_roles_tenant_assigned_by_user" FOREIGN KEY ("iq_tenant_id","assigned_by_user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "idx_capabilities_module_feature" ON "user_management"."capabilities" USING btree ("module","feature");--> statement-breakpoint
CREATE INDEX "idx_delegated_grants_tenant_target_status" ON "user_management"."delegated_capability_grants" USING btree ("iq_tenant_id","target_user_id","status");--> statement-breakpoint
CREATE INDEX "idx_role_capabilities_tenant_role" ON "user_management"."role_capabilities" USING btree ("iq_tenant_id","role_id");--> statement-breakpoint
CREATE INDEX "idx_role_capabilities_capability" ON "user_management"."role_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant_status" ON "user_management"."roles" USING btree ("iq_tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant_role_type" ON "user_management"."roles" USING btree ("iq_tenant_id","role_type");--> statement-breakpoint
CREATE INDEX "idx_user_capabilities_tenant_user" ON "user_management"."user_capabilities" USING btree ("iq_tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_capabilities_tenant_user_revoked" ON "user_management"."user_capabilities" USING btree ("iq_tenant_id","user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "idx_user_capabilities_tenant_capability" ON "user_management"."user_capabilities" USING btree ("iq_tenant_id","capability_id");--> statement-breakpoint
CREATE INDEX "idx_user_clearances_tenant_user" ON "user_management"."user_clearances" USING btree ("iq_tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_tenant_user" ON "user_management"."user_roles" USING btree ("iq_tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_tenant_role" ON "user_management"."user_roles" USING btree ("iq_tenant_id","role_id");