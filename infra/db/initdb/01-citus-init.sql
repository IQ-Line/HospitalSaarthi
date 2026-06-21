-- HIMS Platform — Database initialization
-- Runs once when the PostgreSQL container is first created.
--
-- Extensions ONLY. Extensions are the one thing that must exist before any
-- migration runs.
--
-- Module schemas are created by each module's own migrations (drizzle / Alembic)
-- — do NOT create them here. The drizzle baseline emits a bare
-- `CREATE SCHEMA "<mod>"` (no IF NOT EXISTS), so pre-creating a schema here makes
-- that migration fail with "schema already exists". master-data Alembic creates
-- master_global / master_tenant itself.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
