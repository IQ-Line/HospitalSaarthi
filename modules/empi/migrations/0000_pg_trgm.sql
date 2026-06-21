-- Custom SQL migration file, put your code below! --
-- pg_trgm: required by the empi.patients trigram GIN index (idx_patients_fullname_trgm, 0001_init).
-- Journaled custom migration so it runs once, before the baseline, in every environment (dev/CI/prod).
CREATE EXTENSION IF NOT EXISTS pg_trgm;