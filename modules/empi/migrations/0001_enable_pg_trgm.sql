DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege OR undefined_file OR feature_not_supported THEN
    -- Azure may block extensions unless allow-listed; keep migrations unblocked for now.
    RAISE NOTICE 'Skipping pg_trgm extension enablement (not permitted in this environment).';
END $$;