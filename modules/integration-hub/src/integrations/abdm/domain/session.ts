/**
 * `AbdmSession` — per-flow state row (`integration_hub.abdm_sessions`).
 */

import type {
  M1SessionState,
  M2AddContextsState,
  M2ConsentNotifyState,
  M2HipInitiatedLinkState,
  M2SmsNotifyState,
  M2UserLinkState,
  M3HipState,
  M3HiuState,
} from "@hims/ts-sdk-abha";
import type { M3HiuContext } from "../use-cases/m3/hiu/context.js";

export type AbdmFlowKind =
  | "abdm.m1.aadhaar-otp.v1"
  | "abdm.m1.login.v1"
  | "abdm.m1.verify-existing.v1"
  | "abdm.m2.user-initiated-link.v1"
  | "abdm.m2.hip-initiated-link.v1"
  | "abdm.m2.consent-notify.v1"
  | "abdm.m2.add-contexts.v1"
  | "abdm.m2.sms-notify.v1"
  | "abdm.m3.hip.v1"
  | "abdm.m3.hiu.v1"
  /** Inbound HIP→HIU bundle push dedupe (not a user-facing flow). */
  | "abdm.m3.hiu.transfer-push.v1";

export interface M2UserLinkContext {
  transactionId?: string;
  abhaAddress?: string;
  linkRefNumber?: string;
  patientId?: string;
  careContexts?: Array<{ referenceNumber: string; display: string }>;
  otpToken?: string;
  error?: { code: string; message: string };
}

export interface M2HipLinkContext {
  abhaAddress: string;
  abhaNumber?: string;
  patientName: string;
  phoneNo?: string;
  careContexts: Array<{
    referenceNumber: string;
    display: string;
    hiType: string;
  }>;
  ccLinkRequestId?: string;
  error?: { code: string; message: string };
}

export interface M2ConsentNotifyContext {
  consentId: string;
  requestId: string;
  notification?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export interface M2AddContextsContext {
  abhaAddress: string;
  patientReference: string;
  careContextReferences: string[];
  hiType: string;
  notifyRequestId?: string;
  error?: { code: string; message: string };
}

export interface M2SmsNotifyContext {
  phoneNo: string;
  requestId: string;
}

export interface M3HipContext {
  consentId?: string;
  transactionId?: string;
  dataPushUrl?: string;
  requestId?: string;
  error?: { code: string; message: string };
}

export type { M3HiuContext };

export interface FlowContextMap {
  "abdm.m1.aadhaar-otp.v1": Record<string, unknown>;
  "abdm.m1.login.v1": Record<string, unknown>;
  "abdm.m1.verify-existing.v1": Record<string, unknown>;
  "abdm.m2.user-initiated-link.v1": M2UserLinkContext;
  "abdm.m2.hip-initiated-link.v1": M2HipLinkContext;
  "abdm.m2.consent-notify.v1": M2ConsentNotifyContext;
  "abdm.m2.add-contexts.v1": M2AddContextsContext;
  "abdm.m2.sms-notify.v1": M2SmsNotifyContext;
  "abdm.m3.hip.v1": M3HipContext;
  "abdm.m3.hiu.v1": M3HiuContext;
  "abdm.m3.hiu.transfer-push.v1": Record<string, unknown>;
}

export interface FlowStateMap {
  "abdm.m1.aadhaar-otp.v1": M1SessionState;
  "abdm.m1.login.v1": M1SessionState;
  "abdm.m1.verify-existing.v1": M1SessionState;
  "abdm.m2.user-initiated-link.v1": M2UserLinkState;
  "abdm.m2.hip-initiated-link.v1": M2HipInitiatedLinkState;
  "abdm.m2.consent-notify.v1": M2ConsentNotifyState;
  "abdm.m2.add-contexts.v1": M2AddContextsState;
  "abdm.m2.sms-notify.v1": M2SmsNotifyState;
  "abdm.m3.hip.v1": M3HipState;
  "abdm.m3.hiu.v1": M3HiuState;
  "abdm.m3.hiu.transfer-push.v1": "INIT";
}

/** The three M1 enrolment/login flows; all use a `Record<string, unknown>` context. */
export type M1FlowKind =
  | "abdm.m1.aadhaar-otp.v1"
  | "abdm.m1.login.v1"
  | "abdm.m1.verify-existing.v1";

/**
 * The structural shape of a session for one flow. Parametrized non-distributively:
 * `AbdmSessionShape<AbdmFlowKind>` is the widest single object (all flow kinds, all
 * states, any context) and is a supertype of every `AbdmSession` member — the shape
 * a deserializer produces before the concrete flow is known.
 */
export interface AbdmSessionShape<F extends AbdmFlowKind> {
  iqTenantId: string;
  sessionId: string;
  flowKind: F;
  state: FlowStateMap[F];
  txnId: string | null;
  requestId: string | null;
  xToken: string | null;
  tToken: string | null;
  context: FlowContextMap[F];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A session row. Unparametrized (`AbdmSession`) this distributes into a
 * discriminated union keyed on `flowKind`, so narrowing `flowKind` narrows
 * `state` and `context` to the matching flow. `AbdmSession<"abdm.m3.hip.v1">`
 * selects a single flow.
 */
export type AbdmSession<F extends AbdmFlowKind = AbdmFlowKind> = F extends AbdmFlowKind
  ? AbdmSessionShape<F>
  : never;

/** Any state string a session may hold, across every flow (union of all FSM states). */
export type AbdmSessionState = FlowStateMap[AbdmFlowKind];

export function assertFlowKind<F extends AbdmFlowKind>(
  session: AbdmSession,
  expected: F,
): asserts session is AbdmSession<F> {
  if (session.flowKind !== expected) {
    throw new Error(`Expected flow ${expected}, got ${session.flowKind}`);
  }
}
