-- Custom SQL migration file, put your code below! --
-- Citus topology for the user_management schema.
-- Journaled => runs exactly once. The drizzle node-postgres migrator wraps ALL statements of
-- a migration file in a SINGLE transaction and executes them one at a time, split on the
-- statement-breakpoint markers between statements. Two consequences this file depends on:
--   * Each statement is its own chunk -- Citus rejects multiple utility (DDL) statements sent
--     in one query ("cannot execute multiple utility events").
--   * Because they share one transaction, the SET LOCAL below persists across every later
--     statement here, so drop-FKs -> convert -> re-add-FKs is atomic.
--
-- WHY drop-then-re-add FKs (unlike empi, which had no cross-table FKs):
-- This schema is an FK web -- users/roles are referenced by user_roles, user_capabilities,
-- role_capabilities, delegated_capability_grants, user_clearances; capabilities is referenced
-- by role_capabilities/user_capabilities/delegated_capability_grants. Citus 12.1 forbids
-- distributing a table still referenced by a LOCAL table (a local/reference table may only FK
-- other local/reference tables, never a distributed one). Because every table ends up
-- distributed/reference, there is no incremental conversion order that keeps every
-- intermediate FK legal. The canonical Citus fix for an interconnected schema is: drop the
-- inter-table FKs, convert all tables, then re-add the FKs between the now distributed/
-- reference tables (colocated by iq_tenant_id), which are legal again.
--
-- SET LOCAL citus.multi_shard_modify_mode = sequential: required because some re-added FKs
-- target the capabilities REFERENCE table; Citus needs a single connection per node for
-- those to stay consistent within the transaction (otherwise: "parallel operation on a
-- distributed table in the transaction").
SET LOCAL citus.multi_shard_modify_mode TO 'sequential';--> statement-breakpoint
ALTER TABLE user_management.role_capabilities DROP CONSTRAINT fk_role_capabilities_tenant_role;--> statement-breakpoint
ALTER TABLE user_management.role_capabilities DROP CONSTRAINT fk_role_capabilities_capability;--> statement-breakpoint
ALTER TABLE user_management.user_roles DROP CONSTRAINT fk_user_roles_tenant_user;--> statement-breakpoint
ALTER TABLE user_management.user_roles DROP CONSTRAINT fk_user_roles_tenant_role;--> statement-breakpoint
ALTER TABLE user_management.user_roles DROP CONSTRAINT fk_user_roles_tenant_assigned_by_user;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities DROP CONSTRAINT fk_user_capabilities_tenant_user;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities DROP CONSTRAINT fk_user_capabilities_capability;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities DROP CONSTRAINT fk_user_capabilities_tenant_source_role;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities DROP CONSTRAINT fk_user_capabilities_tenant_granted_by_user;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities DROP CONSTRAINT fk_user_capabilities_tenant_revoked_by_user;--> statement-breakpoint
ALTER TABLE user_management.delegated_capability_grants DROP CONSTRAINT fk_delegated_grants_tenant_source_user;--> statement-breakpoint
ALTER TABLE user_management.delegated_capability_grants DROP CONSTRAINT fk_delegated_grants_tenant_target_user;--> statement-breakpoint
ALTER TABLE user_management.delegated_capability_grants DROP CONSTRAINT fk_delegated_grants_capability;--> statement-breakpoint
ALTER TABLE user_management.user_clearances DROP CONSTRAINT fk_user_clearances_tenant_user;--> statement-breakpoint
SELECT create_reference_table('user_management.capabilities');--> statement-breakpoint
SELECT create_distributed_table('user_management.users', 'iq_tenant_id');--> statement-breakpoint
SELECT create_distributed_table('user_management.roles', 'iq_tenant_id');--> statement-breakpoint
SELECT create_distributed_table('user_management.user_roles', 'iq_tenant_id');--> statement-breakpoint
SELECT create_distributed_table('user_management.role_capabilities', 'iq_tenant_id');--> statement-breakpoint
SELECT create_distributed_table('user_management.user_capabilities', 'iq_tenant_id');--> statement-breakpoint
SELECT create_distributed_table('user_management.delegated_capability_grants', 'iq_tenant_id');--> statement-breakpoint
SELECT create_distributed_table('user_management.user_clearances', 'iq_tenant_id');--> statement-breakpoint
ALTER TABLE user_management.role_capabilities ADD CONSTRAINT fk_role_capabilities_tenant_role FOREIGN KEY (iq_tenant_id, role_id) REFERENCES user_management.roles (iq_tenant_id, id) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.role_capabilities ADD CONSTRAINT fk_role_capabilities_capability FOREIGN KEY (capability_id) REFERENCES user_management.capabilities (id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_roles ADD CONSTRAINT fk_user_roles_tenant_user FOREIGN KEY (iq_tenant_id, user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_roles ADD CONSTRAINT fk_user_roles_tenant_role FOREIGN KEY (iq_tenant_id, role_id) REFERENCES user_management.roles (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_roles ADD CONSTRAINT fk_user_roles_tenant_assigned_by_user FOREIGN KEY (iq_tenant_id, assigned_by_user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities ADD CONSTRAINT fk_user_capabilities_tenant_user FOREIGN KEY (iq_tenant_id, user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities ADD CONSTRAINT fk_user_capabilities_capability FOREIGN KEY (capability_id) REFERENCES user_management.capabilities (id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities ADD CONSTRAINT fk_user_capabilities_tenant_source_role FOREIGN KEY (iq_tenant_id, source_role_id) REFERENCES user_management.roles (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities ADD CONSTRAINT fk_user_capabilities_tenant_granted_by_user FOREIGN KEY (iq_tenant_id, granted_by_user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_capabilities ADD CONSTRAINT fk_user_capabilities_tenant_revoked_by_user FOREIGN KEY (iq_tenant_id, revoked_by_user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.delegated_capability_grants ADD CONSTRAINT fk_delegated_grants_tenant_source_user FOREIGN KEY (iq_tenant_id, source_user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.delegated_capability_grants ADD CONSTRAINT fk_delegated_grants_tenant_target_user FOREIGN KEY (iq_tenant_id, target_user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.delegated_capability_grants ADD CONSTRAINT fk_delegated_grants_capability FOREIGN KEY (capability_id) REFERENCES user_management.capabilities (id) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE user_management.user_clearances ADD CONSTRAINT fk_user_clearances_tenant_user FOREIGN KEY (iq_tenant_id, user_id) REFERENCES user_management.users (iq_tenant_id, id) ON DELETE cascade ON UPDATE restrict;
-- LOCAL EXCEPTION: the better-auth auth schema (auth.user/session/account/verification/jwks,
-- created in 0001_better_auth_schema.sql) is NON-distributable (TEXT PKs, no iq_tenant_id
-- shard key) and is intentionally left as plain coordinator tables -- no Citus call here.
