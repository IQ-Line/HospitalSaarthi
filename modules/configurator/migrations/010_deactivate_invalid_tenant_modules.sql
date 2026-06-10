-- Deactivate tenant_modules rows that cannot be resolved against Master Data catalog.
-- Prevents UM MODULE_ENTITLEMENT_LOOKUP_FAILED (ADR-0032) when module_id is missing,
-- soft-deleted, or from another environment (non-portable gen_random_uuid seeds).
--
-- Idempotent: only touches rows that are currently is_active = true.
-- Citus-safe: requires tenant_modules distributed (002) and global_master.modules as
-- reference table (master-data Alembic 002). Skips until both preconditions are met.
-- Makefile re-runs configurator:db-migrate after master-data:migrate for this pass.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'global_master'
      AND table_name = 'modules'
  ) THEN
    RAISE NOTICE '010_deactivate_invalid_tenant_modules: skip — global_master.modules not provisioned';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_distributed_table') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_dist_partition
      WHERE logicalrelid = 'configurator.tenant_modules'::regclass
    ) THEN
      RAISE NOTICE '010_deactivate_invalid_tenant_modules: skip — tenant_modules not distributed';
      RETURN;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_dist_partition
      WHERE logicalrelid = 'global_master.modules'::regclass
    ) THEN
      RAISE NOTICE '010_deactivate_invalid_tenant_modules: skip — global_master.modules not in Citus catalog (run master-data migrate first)';
      RETURN;
    END IF;
  END IF;

  UPDATE configurator.tenant_modules tm
  SET
    is_core_override = false,
    is_active = false,
    updated_at = now()
  WHERE tm.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM global_master.modules m
      WHERE m.id = tm.module_id
        AND m.is_deleted = false
    );

  -- L2+ rows are not tenant-toggle targets (L1-only UI); deactivate stale child enablement.
  -- Skip is_core_override rows (infrastructure backfill from 005) — they must stay active.
  UPDATE configurator.tenant_modules tm
  SET
    is_active = false,
    updated_at = now()
  WHERE tm.is_active = true
    AND NOT tm.is_core_override
    AND EXISTS (
      SELECT 1
      FROM global_master.modules m
      WHERE m.id = tm.module_id
        AND m.is_deleted = false
        AND (m.level > 1 OR m.parent_id IS NOT NULL)
    );
END $$;
