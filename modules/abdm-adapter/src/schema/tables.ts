/**
 * Drizzle table definitions for the `abdm_adapter` schema.
 *
 * Single table for Phase 0 — `abdm_sessions` — holds the per-flow state row
 * across milestones. Scalar columns are indexed lookup keys; `context JSONB`
 * absorbs everything else (identifiers, care contexts, consent artefact,
 * key material, HIU request metadata).
 *
 * Migration target: when the Integration Platform's FSM engine ships
 * (per ADR-0027), rows port one-to-one into `integration_platform.integration_workflows`.
 * Column mapping:
 *   - `iq_tenant_id`  → `iq_tenant_id`
 *   - `session_id`    → `workflow_id`
 *   - `flow_kind`     → `flow_kind`
 *   - `state`         → `state`
 *   - `context`       → `context` (jsonb)
 *   - scalar tokens   → folded into `context` (no longer indexed at top level)
 */

import {
  pgSchema,
  uuid,
  text,
  jsonb,
  index,
  primaryKey,
  timestamp,
  tenantColumn,
} from "@hims/ts-sdk-db";

export const ABDM_ADAPTER_SCHEMA_NAME = "abdm_adapter" as const;

export const abdmAdapterSchema = pgSchema(ABDM_ADAPTER_SCHEMA_NAME);

export const abdmSessions = abdmAdapterSchema.table(
  "abdm_sessions",
  {
    ...tenantColumn(),
    session_id: uuid("session_id").defaultRandom().notNull(),
    flow_kind: text("flow_kind").notNull(),
    state: text("state").notNull(),
    txn_id: text("txn_id"),
    request_id: text("request_id"),
    x_token: text("x_token"),
    t_token: text("t_token"),
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.session_id] }),
    index("idx_abdm_sessions_txn").on(t.iq_tenant_id, t.txn_id),
    index("idx_abdm_sessions_flow_state").on(t.iq_tenant_id, t.flow_kind, t.state),
  ],
);
