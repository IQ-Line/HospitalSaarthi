-- HIMS Platform — Database initialization
-- Runs once when the PostgreSQL container is first created.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- All module schemas live in hims_dev. Each module owns one schema (e.g. user_management, configurator, empi).
-- Module Drizzle migrations create tables inside those schemas on DATABASE_URL.
-- Master Data catalog uses global_master and tenant_master schemas on hims_dev (Alembic) — not the legacy master_data schema shell here.
CREATE SCHEMA IF NOT EXISTS user_management;
CREATE SCHEMA IF NOT EXISTS configurator;
CREATE SCHEMA IF NOT EXISTS empi;
