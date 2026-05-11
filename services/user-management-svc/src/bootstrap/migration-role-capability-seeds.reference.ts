/**
 * @fileoverview **Non-authoritative** shapes for SQL migrations and offline seed tooling only.
 *
 * Runtime authorization must **not** use any static `role → capability` map. Effective capabilities
 * for Cerbos come only from persisted `user_management.role_capabilities` (see
 * `DrizzleAbacAttributeRepository` in `@hims/user-management`) or from explicit test doubles
 * (`InMemoryAbacAttributeRepository.seedRoleCapability`).
 *
 * **Do not import this module from `main.ts`, Fastify plugins, HTTP handlers, or Cerbos paths.**
 * There is intentionally no `BUILTIN_ROLE_CAPABILITIES` (or equivalent) on the request/runtime path.
 */
export type MigrationRoleCapabilitySeedRow = Readonly<{
  iq_tenant_id: string;
  role_id: string;
  capability: string;
}>;
