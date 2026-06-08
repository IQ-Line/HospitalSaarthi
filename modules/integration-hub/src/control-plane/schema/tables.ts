import {
  pgSchema,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  primaryKey,
  tenantColumn,
  auditColumns,
} from "@hims/ts-sdk-db";
import { INTEGRATION_HUB_SCHEMA_NAME } from "../../integrations/abdm/schema/tables.js";

export const controlPlaneSchema = pgSchema(INTEGRATION_HUB_SCHEMA_NAME);

export const integrations = controlPlaneSchema.table(
  "integrations",
  {
    ...tenantColumn(),
    integration_id: uuid("integration_id").defaultRandom().notNull(),
    integration_type: text("integration_type").notNull(),
    display_name: text("display_name").notNull(),
    status: text("status").notNull().default("draft"),
    partner_principal_id: uuid("partner_principal_id"),
    config: jsonb("config").notNull().default({}),
    ...auditColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.iq_tenant_id, table.integration_id] }),
    index("idx_integrations_tenant_status").on(table.iq_tenant_id, table.status),
    index("idx_integrations_tenant_type").on(table.iq_tenant_id, table.integration_type),
  ],
);

export const integrationApiKeys = controlPlaneSchema.table(
  "integration_api_keys",
  {
    ...tenantColumn(),
    api_key_id: uuid("api_key_id").defaultRandom().notNull(),
    integration_id: uuid("integration_id").notNull(),
    key_prefix: text("key_prefix").notNull(),
    key_hash: text("key_hash").notNull(),
    status: text("status").notNull().default("active"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    created_by: uuid("created_by"),
  },
  (table) => [
    primaryKey({ columns: [table.iq_tenant_id, table.api_key_id] }),
    index("idx_integration_api_keys_integration").on(
      table.iq_tenant_id,
      table.integration_id,
    ),
  ],
);
