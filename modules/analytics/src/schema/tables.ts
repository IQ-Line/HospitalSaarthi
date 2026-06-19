import {
  index,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  tenantColumn,
  auditColumns,
} from "@hims/ts-sdk-db";

export const ANALYTICS_SCHEMA_NAME = "analytics";

export const analyticsSchema = pgSchema(ANALYTICS_SCHEMA_NAME);

export const reportSnapshots = analyticsSchema.table(
  "report_snapshots",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    report_key: text("report_key").notNull(),
    generated_at: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload").notNull().default({}),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_report_snapshots_tenant_key_generated").on(
      t.iq_tenant_id,
      t.report_key,
      t.generated_at,
    ),
    index("idx_report_snapshots_key").on(
      t.iq_tenant_id,
      t.report_key,
      t.generated_at,
    ),
  ],
);
