-- abdm-adapter schema — aligned with modules/abdm-adapter/src/schema/tables.ts (Drizzle).
-- Apply: psql "$DATABASE_URL" -f modules/abdm-adapter/migrations/0000_abdm_adapter_schema.sql
-- Requires PostgreSQL 13+ (gen_random_uuid).
--
-- Phase 0 owns this schema. When the Integration Platform FSM engine
-- (ADR-0027) ships, rows migrate one-to-one into
-- integration_platform.integration_workflows; this schema is retired.

CREATE SCHEMA IF NOT EXISTS abdm_adapter;

CREATE TABLE IF NOT EXISTS abdm_adapter.abdm_sessions (
  iq_tenant_id uuid NOT NULL,
  session_id   uuid NOT NULL DEFAULT gen_random_uuid(),
  flow_kind    text NOT NULL,
  state        text NOT NULL,
  txn_id       text,
  request_id   text,
  x_token      text,
  t_token      text,
  context      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_sessions_pkey PRIMARY KEY (iq_tenant_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_abdm_sessions_txn
  ON abdm_adapter.abdm_sessions (iq_tenant_id, txn_id);

CREATE INDEX IF NOT EXISTS idx_abdm_sessions_flow_state
  ON abdm_adapter.abdm_sessions (iq_tenant_id, flow_kind, state);

-- TODO (Phase 1, before any tenant goes live):
--   SELECT create_distributed_table('abdm_adapter.abdm_sessions', 'iq_tenant_id');
-- Citus distribution by iq_tenant_id once the operator gates the migration.
