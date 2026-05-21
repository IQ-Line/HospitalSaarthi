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
  boolean,
  smallint,
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
    /** Profile JWT from NHA — encrypt at rest in production (KMS / column crypto). */
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

export const abdmInboundMessages = abdmAdapterSchema.table(
  "abdm_inbound_messages",
  {
    ...tenantColumn(),
    request_id: text("request_id").notNull(),
    flow_kind: text("flow_kind").notNull(),
    received_at: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.request_id] })],
);

export const abdmLinkTokens = abdmAdapterSchema.table(
  "abdm_link_tokens",
  {
    ...tenantColumn(),
    abha_address: text("abha_address").notNull(),
    link_token: text("link_token"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    obtained_at: timestamp("obtained_at", { withTimezone: true }),
    pending_request_id: text("pending_request_id"),
    pending_expires_at: timestamp("pending_expires_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.abha_address] })],
);

export const abdmLinkOtps = abdmAdapterSchema.table(
  "abdm_link_otps",
  {
    ...tenantColumn(),
    link_ref_number: text("link_ref_number").notNull(),
    otp_hash: text("otp_hash").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: smallint("attempts").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.link_ref_number] }),
    index("ix_abdm_link_otps_expires").on(t.expires_at),
  ],
);

export const abdmConsentArtefacts = abdmAdapterSchema.table(
  "abdm_consent_artefacts",
  {
    ...tenantColumn(),
    consent_id: text("consent_id").notNull(),
    patient_id: uuid("patient_id").notNull(),
    hip_id: text("hip_id").notNull(),
    hiu_id: text("hiu_id").notNull(),
    status: text("status").notNull(),
    data_erase_at: timestamp("data_erase_at", { withTimezone: true }).notNull(),
    granted_at: timestamp("granted_at", { withTimezone: true }).notNull(),
    artefact_json: jsonb("artefact_json").$type<Record<string, unknown>>().notNull(),
    signature: text("signature").notNull(),
    signature_valid: boolean("signature_valid").notNull().default(false),
    received_at: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.consent_id] }),
    index("ix_abdm_consent_patient").on(t.iq_tenant_id, t.patient_id),
  ],
);
