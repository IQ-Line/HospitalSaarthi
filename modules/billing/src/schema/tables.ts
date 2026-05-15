import {
  boolean,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
  tenantColumn,
} from "@hims/ts-sdk-db";

export const BILLING_SCHEMA_NAME = "billing" as const;
export const billingSchema = pgSchema(BILLING_SCHEMA_NAME);

export const billingMaster = billingSchema.table(
  "tariff_master",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    service_code: text("service_code").notNull(),
    service_name: text("service_name").notNull(),
    description: text("description"),
    provider_id: uuid("provider_id"),
    department: text("department"),
    category: text("category"),
    sub_category: text("sub_category"),
    base_price: numeric("base_price", { precision: 18, scale: 4 }).notNull(),
    tax_percentage: numeric("tax_percentage", { precision: 7, scale: 4 })
      .notNull()
      .default("0"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.id] })],
);
