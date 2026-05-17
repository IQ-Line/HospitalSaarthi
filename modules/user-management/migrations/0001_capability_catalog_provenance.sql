-- Future-safe provenance for Master Data catalog sync (nullable; no sync implemented yet).

ALTER TABLE user_management.capabilities
  ADD COLUMN IF NOT EXISTS source_module_slug text,
  ADD COLUMN IF NOT EXISTS source_permission_slug text,
  ADD COLUMN IF NOT EXISTS source_catalog text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capabilities_source_catalog_chk'
      AND conrelid = 'user_management.capabilities'::regclass
  ) THEN
    ALTER TABLE user_management.capabilities
      ADD CONSTRAINT capabilities_source_catalog_chk
      CHECK (source_catalog IS NULL OR source_catalog IN ('master_data'));
  END IF;
END $$;
