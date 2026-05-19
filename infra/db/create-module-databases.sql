-- Create per-module databases on the local Citus/Postgres instance.
-- Invoked automatically by `make db-create-modules` (also part of `make setup`).

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
