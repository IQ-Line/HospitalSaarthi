-- Citus: distribute tenant_modules before cross-catalog data fixes (010).
-- Single-statement migration — safe through PgBouncer (no multi-utility batch).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_distributed_table') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_dist_partition
    WHERE logicalrelid = 'configurator.tenant_modules'::regclass
  ) THEN
    RETURN;
  END IF;

  PERFORM create_distributed_table('configurator.tenant_modules', 'iq_tenant_id');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
