import { tenantColumn, auditColumns } from "@hims/ts-sdk-db";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgSchema,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Citus: distributed by `iq_tenant_id` (see User Management LLD §13). */
export const userManagementSchema = pgSchema("user_management");

export const users = userManagementSchema.table(
  "users",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    /** better-auth / external identity anchor (nullable until linked). */
    auth_user_id: uuid("auth_user_id"),
    status: text("status").notNull().default("active"),
    /** Login handle; unique per tenant when set (multiple NULLs allowed). */
    username: text("username"),
    /** Configurator `organizations.id` — logical reference only (no FK). */
    org_id: uuid("org_id"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check(
      "users_status_chk",
      sql`${t.status} in ('active', 'inactive', 'suspended')`,
    ),
    unique("uq_users_tenant_username").on(t.iq_tenant_id, t.username),
  ],
);

export const roles = userManagementSchema.table(
  "roles",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    code: text("code").notNull(),
    display_name: text("display_name").notNull(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check("roles_code_not_blank_chk", sql`length(btrim(${t.code})) > 0`),
    check("roles_code_canonical_chk", sql`${t.code} = lower(btrim(${t.code}))`),
    unique("uq_roles_tenant_code").on(t.iq_tenant_id, t.code),
  ],
);

export const role_assignments = userManagementSchema.table(
  "role_assignments",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    /**
     * TODO(Phase 1B): `roles` table + FK enforcement are intentionally deferred.
     * `role_id` currently acts as a placeholder identifier; Phase 1B will add
     * `roles`, role capabilities/permissions tables, and FK validation.
     */
    role_id: uuid("role_id").notNull(),
    ...auditColumns(),
  },
  (t) => [
    /**
     * FK policy: RESTRICT delete/update so assignments cannot outlive referenced
     * users/roles, and users/roles cannot be removed while assignments exist.
     */
    foreignKey({
      name: "fk_role_assignments_tenant_user",
      columns: [t.iq_tenant_id, t.user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_role_assignments_tenant_role",
      columns: [t.iq_tenant_id, t.role_id],
      foreignColumns: [roles.iq_tenant_id, roles.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_role_assignments_tenant_user_role").on(t.iq_tenant_id, t.user_id, t.role_id),
    index("idx_role_assignments_tenant_user").on(t.iq_tenant_id, t.user_id),
  ],
);
