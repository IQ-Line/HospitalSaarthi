CREATE TABLE "user_management"."platform_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"note" text
);
--> statement-breakpoint
-- Citus: platform_admins is tenant-less, small, and globally read (JWT scope issuance +
-- Cerbos scope enrichment). A reference table (replicated to all nodes) is the canonical Citus
-- shape for it, mirroring user_management.capabilities. Journaled => runs exactly once; the
-- CREATE TABLE above and this call share one migration transaction (drizzle splits on the
-- statement-breakpoint and sends each statement separately, which Citus requires for DDL).
-- The 0006 drizzle snapshot is unchanged by this hand-added line, so `drizzle-kit generate`
-- produces no diff (the schema drift check stays green).
SELECT create_reference_table('user_management.platform_admins');
