-- Create per-module databases on the local Citus/Postgres instance.
-- Run once (from repo root), e.g.:
--   docker exec -i hims-postgres psql -U hims -d hims_dev -f - < infra/db/create-module-databases.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hims-configurator') THEN
    CREATE DATABASE "hims-configurator";
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hims-user-management') THEN
    CREATE DATABASE "hims-user-management";
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hims-master') THEN
    CREATE DATABASE "hims-master";
  END IF;
END
$$;
