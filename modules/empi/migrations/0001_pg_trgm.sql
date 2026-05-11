-- Fuzzy name search (ILIKE / similarity) — requires pg_trgm + GIN on full_name.
-- Apply after 0000_empi_schema.sql: psql "$DATABASE_URL" -f modules/empi/migrations/0001_pg_trgm.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Replace legacy btree name index if an older 0000 revision created it.
DROP INDEX IF EXISTS empi.idx_patients_fullname;

CREATE INDEX IF NOT EXISTS idx_patients_fullname_trgm ON empi.patients USING gin (full_name gin_trgm_ops);
