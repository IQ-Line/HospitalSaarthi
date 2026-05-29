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

export const abdmM3ConsentRequests = abdmAdapterSchema.table(
  "abdm_m3_consent_requests",
  {
    ...tenantColumn(),
    consent_request_id: text("consent_request_id").notNull(),
    session_id: uuid("session_id").notNull(),
    patient_abha_address: text("patient_abha_address").notNull(),
    hip_id: text("hip_id"),
    purpose_code: text("purpose_code").notNull(),
    hi_types: text("hi_types").array().notNull(),
    permission_date_from: timestamp("permission_date_from", { withTimezone: true }).notNull(),
    permission_date_to: timestamp("permission_date_to", { withTimezone: true }).notNull(),
    data_erase_at: timestamp("data_erase_at", { withTimezone: true }).notNull(),
    state: text("state").notNull(),
    consent_artefact_ids: text("consent_artefact_ids").array().notNull().default([]),
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.consent_request_id] }),
    index("ix_m3_consent_requests_session").on(t.iq_tenant_id, t.session_id),
    index("ix_m3_consent_requests_state").on(t.iq_tenant_id, t.state),
  ],
);

export const abdmM3ConsentArtefactsHiu = abdmAdapterSchema.table(
  "abdm_m3_consent_artefacts_hiu",
  {
    ...tenantColumn(),
    consent_id: text("consent_id").notNull(),
    consent_request_id: text("consent_request_id").notNull(),
    patient_abha_address: text("patient_abha_address").notNull(),
    hip_id: text("hip_id").notNull(),
    status: text("status").notNull(),
    data_erase_at: timestamp("data_erase_at", { withTimezone: true }).notNull(),
    granted_at: timestamp("granted_at", { withTimezone: true }).notNull(),
    hi_types: text("hi_types").array().notNull(),
    care_contexts: jsonb("care_contexts").$type<unknown[]>().notNull(),
    artefact_json: jsonb("artefact_json").$type<Record<string, unknown>>().notNull(),
    signature: text("signature").notNull(),
    signature_valid: boolean("signature_valid").notNull().default(false),
    received_at: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.consent_id] }),
    index("ix_m3_artefacts_hiu_patient").on(t.iq_tenant_id, t.patient_abha_address),
    index("ix_m3_artefacts_hiu_request").on(t.iq_tenant_id, t.consent_request_id),
  ],
);

export const abdmM3DataTransfers = abdmAdapterSchema.table(
  "abdm_m3_data_transfers",
  {
    ...tenantColumn(),
    transfer_id: uuid("transfer_id").notNull(),
    session_id: uuid("session_id"),
    flow_kind: text("flow_kind").notNull().default("abdm.m3.hiu.v1"),
    state: text("state").notNull(),
    consent_id: text("consent_id").notNull(),
    outbound_request_id: text("outbound_request_id"),
    cm_transaction_id: text("cm_transaction_id"),
    hiu_private_key_jwk: text("hiu_private_key_jwk").notNull(),
    hiu_public_key_b64: text("hiu_public_key_b64").notNull(),
    hiu_nonce_b64: text("hiu_nonce_b64").notNull(),
    hip_public_key_b64: text("hip_public_key_b64"),
    hip_nonce_b64: text("hip_nonce_b64"),
    data_push_url: text("data_push_url").notNull(),
    bundle_json: jsonb("bundle_json").$type<Record<string, unknown>>(),
    error: jsonb("error").$type<{ code: string; message: string }>(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    awaiting_push_until: timestamp("awaiting_push_until", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.transfer_id] }),
    index("ix_m3_transfers_consent").on(t.iq_tenant_id, t.consent_id),
    index("ix_m3_transfers_txn").on(t.iq_tenant_id, t.cm_transaction_id),
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
