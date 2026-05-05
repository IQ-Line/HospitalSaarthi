import { index, pgSchema, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/** Citus: distributed by `iq_tenant_id` (see User Management LLD §13). */
export const userManagementSchema = pgSchema("user_management");

export const users = userManagementSchema.table(
  "users",
  {
    iq_tenant_id: uuid("iq_tenant_id").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.id] })],
);

export const role_assignments = userManagementSchema.table(
  "role_assignments",
  {
    iq_tenant_id: uuid("iq_tenant_id").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    role_id: uuid("role_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_role_assignments_tenant_user_role").on(t.iq_tenant_id, t.user_id, t.role_id),
    index("idx_role_assignments_tenant_user").on(t.iq_tenant_id, t.user_id),
  ],
);
