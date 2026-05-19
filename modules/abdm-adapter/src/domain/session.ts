/**
 * `AbdmSession` — the per-flow state row that survives between gateway hops.
 *
 * Maps 1:1 to a row in `abdm_adapter.abdm_sessions`. Scalar fields are
 * promoted out of the prod-HIMS Mongo `Session` document into typed columns
 * for indexed lookups; everything else (identifiers snapshot, careContext
 * snapshot, consent artefact, HI request metadata) lives in `context` JSONB.
 *
 * The `state` field carries an FSM state name from
 * `@hims/ts-sdk-abha/constants/fsm-states`. Even though Phase-0 has no FSM
 * engine driving transitions, naming the state with the same constants is
 * what makes the eventual port-to-`integration_workflows` a column rename
 * rather than a schema redesign.
 */

import type {
  M1SessionState,
  M2UserLinkState,
  M3HipState,
  M3HiuState,
} from "@hims/ts-sdk-abha";

/** Flow identifier — one per `(milestone, variant, version)` triple. */
export type AbdmFlowKind =
  | "abdm.m1.aadhaar-otp.v1"
  | "abdm.m1.login.v1"
  | "abdm.m1.verify-existing.v1"
  | "abdm.m2.user-link.v1"
  | "abdm.m2.add-contexts.v1"
  | "abdm.m3.hip.v1"
  | "abdm.m3.hiu.v1";

/** Aggregate state name — discriminated by `flowKind` at the call site. */
export type AbdmSessionState =
  | M1SessionState
  | M2UserLinkState
  | M3HipState
  | M3HiuState;

export interface AbdmSession {
  iqTenantId: string;
  sessionId: string;
  flowKind: AbdmFlowKind;
  state: AbdmSessionState;
  txnId: string | null;
  requestId: string | null;
  xToken: string | null;
  tToken: string | null;
  /**
   * Bag of fields the FSM context will eventually own verbatim:
   *   - `identifiers` snapshot (abha_address, abha_number, name, dob, ...)
   *   - `careContexts` (M2/M3)
   *   - `consentArtefact` (M2 inbound / M3 stored)
   *   - `linkBody`, `linkToken` (M2)
   *   - `keyMaterial` (M3 Fidelius exchange)
   *   - `dataPushUrl`, `transferDetails`, `hiuRequestMetaData` (M3)
   */
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
