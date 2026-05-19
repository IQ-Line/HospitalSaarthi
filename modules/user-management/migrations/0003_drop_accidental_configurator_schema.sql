-- Configurator owns org/tenant data in database `hims-configurator` (schema `configurator`).
-- If configurator migrations were applied against `hims-user-management` by mistake, remove them.

DROP SCHEMA IF EXISTS configurator CASCADE;
