-- Drop application data in hims_dev (shared operational DB).
-- Keeps public extensions and Citus/columnar system schemas.

DROP SCHEMA IF EXISTS abdm_adapter CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS billing CASCADE;
DROP SCHEMA IF EXISTS configurator CASCADE;
DROP SCHEMA IF EXISTS empi CASCADE;
DROP SCHEMA IF EXISTS master_data CASCADE;
DROP SCHEMA IF EXISTS registration CASCADE;
DROP SCHEMA IF EXISTS user_management CASCADE;

-- Application tables in public only (not Citus-owned views)
DO $$
DECLARE
  r RECORD;
  drop_kind text;
BEGIN
  FOR r IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'm', 'S', 'f', 'p')
      AND c.relname NOT LIKE 'pg\_%' ESCAPE '\'
  LOOP
    drop_kind := CASE r.relkind
      WHEN 'r' THEN 'TABLE'
      WHEN 'p' THEN 'TABLE'
      WHEN 'm' THEN 'MATERIALIZED VIEW'
      WHEN 'S' THEN 'SEQUENCE'
      WHEN 'f' THEN 'FOREIGN TABLE'
    END;
    EXECUTE format('DROP %s IF EXISTS public.%I CASCADE', drop_kind, r.relname);
  END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS user_management;
CREATE SCHEMA IF NOT EXISTS configurator;
CREATE SCHEMA IF NOT EXISTS empi;
