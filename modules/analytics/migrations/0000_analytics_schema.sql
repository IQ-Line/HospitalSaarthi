-- Analytics module schema — aligned with modules/analytics/src/schema/tables.ts (Drizzle).
-- Apply: psql "$DATABASE_URL" -f modules/analytics/migrations/0000_analytics_schema.sql
-- Requires PostgreSQL 13+ (gen_random_uuid). Citus: distribute by iq_tenant_id when coordinator is configured.

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.report_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  report_key text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT report_snapshots_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_report_snapshots_tenant_key_generated UNIQUE (iq_tenant_id, report_key, generated_at)
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_key
  ON analytics.report_snapshots (iq_tenant_id, report_key, generated_at DESC);
