import { tenantColumn, auditColumns } from "@hims/ts-sdk-db";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const integrationHubControlPlaneSchema = pgSchema("integration_hub");

export const integrations = integrationHubControlPlaneSchema.table(
  "integrations",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    name: text("name").notNull(),
    integration_type: text("integration_type").notNull(),
    direction: text("direction").notNull(),
    status: text("status").notNull().default("draft"),
    partner_principal_id: uuid("partner_principal_id"),
    config: jsonb("config").notNull().default({}),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check(
      "integrations_direction_chk",
      sql`${t.direction} in ('inbound', 'outbound', 'bidirectional')`,
    ),
    check("integrations_status_chk", sql`${t.status} in ('draft', 'active', 'disabled')`),
    check(
      "integrations_partner_principal_active_chk",
      sql`${t.status} = 'draft' or ${t.partner_principal_id} is not null`,
    ),
    index("idx_integrations_tenant_status").on(t.iq_tenant_id, t.status),
    index("idx_integrations_tenant_type").on(t.iq_tenant_id, t.integration_type),
  ],
);

export const integrationApiKeys = integrationHubControlPlaneSchema.table(
  "integration_api_keys",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    integration_id: uuid("integration_id").notNull(),
    key_prefix: text("key_prefix").notNull(),
    key_hash: text("key_hash").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("active"),
    rate_limit_rpm: integer("rate_limit_rpm"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    created_by: uuid("created_by"),
    revoked_by: uuid("revoked_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check(
      "integration_api_keys_status_chk",
      sql`${t.status} in ('active', 'revoked', 'expired')`,
    ),
    index("idx_integration_api_keys_tenant_integration").on(t.iq_tenant_id, t.integration_id),
  ],
);
