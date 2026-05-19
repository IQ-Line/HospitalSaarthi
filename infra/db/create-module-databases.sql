-- Create per-module databases on the local Citus/Postgres instance.
-- Invoked automatically by `make db-create-modules` (also part of `make setup`).
--
-- Citus cannot run CREATE DATABASE inside PL/pgSQL (DO blocks); use plain SQL.

SELECT 'CREATE DATABASE "hims-configurator"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hims-configurator')\gexec

SELECT 'CREATE DATABASE "hims-user-management"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hims-user-management')\gexec

SELECT 'CREATE DATABASE "hims-master"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hims-master')\gexec
