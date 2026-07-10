-- Custom SQL migration file, put your code below! --
-- ADR-0037 / issue #60: reshape user_capabilities from the ADR-0031 role-derived SNAPSHOT into a
-- pure per-user OVERRIDE table (effect 'grant'|'deny' + reason). role_capabilities is now read
-- live at principal hydration, so the snapshot columns (grant_source, source_role_id, revoked_at,
-- revoked_by_user_id) and their FKs/CHECK/index are gone.
--
-- DISPOSABLE pre-prod reshape (branch decision D2 / ADR-0037 §"Migration approach"): no production
-- tenant is on this table, so it is dropped and recreated in the new shape rather than ALTERed.
-- Run `make db-reset` in a live-dev environment.
--
-- Citus: user_capabilities was create_distributed_table('...','iq_tenant_id') in 0002. DROP+CREATE
-- lands it as a plain LOCAL table, so it MUST be re-distributed here (mirrors 0002). As in 0002 the
-- inter-table FKs are added AFTER distribution: a LOCAL table may not FK a DISTRIBUTED one, and the
-- capability FK targets the `capabilities` REFERENCE table (hence sequential multi-shard mode, per
-- the 0002 rationale). The drizzle node-postgres migrator wraps this whole file in ONE transaction,
-- splitting on the statement-breakpoint markers, so SET LOCAL persists across every statement below.
SET LOCAL citus.multi_shard_modify_mode TO 'sequential';--> statement-breakpoint
DROP TABLE IF EXISTS "user_management"."user_capabilities" CASCADE;--> statement-breakpoint
CREATE TABLE "user_management"."user_capabilities" (
	"iq_tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"effect" text NOT NULL,
	"reason" text,
	"granted_by_user_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_capabilities_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id"),
	CONSTRAINT "uq_user_capabilities_tenant_user_capability" UNIQUE("iq_tenant_id","user_id","capability_id"),
	CONSTRAINT "user_capabilities_effect_chk" CHECK ("user_management"."user_capabilities"."effect" in ('grant', 'deny'))
);--> statement-breakpoint
SELECT create_distributed_table('user_management.user_capabilities', 'iq_tenant_id');--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_tenant_user" FOREIGN KEY ("iq_tenant_id","user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_capability" FOREIGN KEY ("capability_id") REFERENCES "user_management"."capabilities"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_management"."user_capabilities" ADD CONSTRAINT "fk_user_capabilities_tenant_granted_by_user" FOREIGN KEY ("iq_tenant_id","granted_by_user_id") REFERENCES "user_management"."users"("iq_tenant_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "idx_user_capabilities_tenant_user" ON "user_management"."user_capabilities" USING btree ("iq_tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_capabilities_tenant_capability" ON "user_management"."user_capabilities" USING btree ("iq_tenant_id","capability_id");
