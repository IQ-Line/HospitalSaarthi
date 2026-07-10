ALTER TABLE "user_management"."users" ADD COLUMN "recovery_tier" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
-- Bare column ref (not schema-qualified): Citus rejects "<schema>"."<table>"."<col>" inside an
-- ALTER TABLE ... ADD CONSTRAINT CHECK on a distributed table ("missing FROM-clause entry"). The
-- generator emits the qualified form (drizzle ${t.col}); this is the journaled §12 hand-fix. The
-- 0004 snapshot is unchanged, so `drizzle-kit generate` produces no diff (drift gate stays green).
ALTER TABLE "user_management"."users" ADD CONSTRAINT "users_recovery_tier_chk" CHECK ("recovery_tier" in ('standard', 'admin_only'));