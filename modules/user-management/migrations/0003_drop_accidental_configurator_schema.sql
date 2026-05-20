-- Configurator owns org/tenant data in schema `configurator` on hims_dev (not user_management).
-- Removes configurator schema if it was applied against the wrong connection by mistake.

DROP SCHEMA IF EXISTS configurator CASCADE;
