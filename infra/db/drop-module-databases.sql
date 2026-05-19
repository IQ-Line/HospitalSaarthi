-- Drop per-module databases (used by `make db-reset` / bootstrap -Reset).
-- Terminate active sessions first; Citus cannot run DROP DATABASE inside DO blocks.

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname IN ('hims-configurator', 'hims-user-management', 'hims-master')
  AND pid <> pg_backend_pid();

SELECT 'DROP DATABASE IF EXISTS "hims-configurator"' \gexec
SELECT 'DROP DATABASE IF EXISTS "hims-user-management"' \gexec
SELECT 'DROP DATABASE IF EXISTS "hims-master"' \gexec
