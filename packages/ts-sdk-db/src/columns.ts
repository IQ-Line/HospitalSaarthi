import { uuid, timestamp } from "drizzle-orm/pg-core";

export function tenantColumn() {
  return {
    iq_tenant_id: uuid("iq_tenant_id").notNull(),
  } as const;
}

export function auditColumns() {
  return {
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
  } as const;
}

export function allStandardColumns() {
  return {
    ...tenantColumn(),
    ...auditColumns(),
  } as const;
}
