/**
 * @fileoverview **Non-authoritative** shapes for SQL migrations and offline seed tooling only.
 *
 * Runtime authorization must **not** use any static `role → permission` map. Effective permission IDs
 * for Cerbos come only from persisted `user_management.role_permissions` (see
 * `DrizzleAbacAttributeRepository` in `@hims/user-management`) or from explicit test doubles
 * (`InMemoryAbacAttributeRepository.seedRolePermission`).
 *
 * **Do not import this module from `main.ts`, Fastify plugins, HTTP handlers, or Cerbos paths.**
 * There is intentionally no `BUILTIN_ROLE_PERMISSIONS` (or equivalent) on the request/runtime path.
 */
export type MigrationRolePermissionSeedRow = Readonly<{
  iq_tenant_id: string;
  role_id: string;
  permission_id: string;
}>;
