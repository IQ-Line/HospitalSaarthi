-- HIMS Platform — Database initialization
-- Runs once when the PostgreSQL container is first created.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create module schemas
CREATE SCHEMA IF NOT EXISTS user_management;
CREATE SCHEMA IF NOT EXISTS configurator;
CREATE SCHEMA IF NOT EXISTS empi;
CREATE SCHEMA IF NOT EXISTS master_data;
