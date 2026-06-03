import type { AbdmFlowKind, AbdmSessionState } from "../domain/session.js";

/** Structured audit line — never pass Aadhaar, OTP, or raw JWTs. */
export function logAbdmSessionAudit(
  logger: { info: (obj: Record<string, unknown>, msg?: string) => void },
  event: {
    iqTenantId: string;
    sessionId: string;
    flowKind: AbdmFlowKind;
    state?: AbdmSessionState;
    prevState?: AbdmSessionState;
    txnId?: string | null;
    action: string;
  },
): void {
  logger.info(
    {
      audit: "abdm.session",
      iqTenantId: event.iqTenantId,
      sessionId: event.sessionId,
      flowKind: event.flowKind,
      ...(event.state !== undefined ? { state: event.state } : {}),
      ...(event.prevState !== undefined ? { prevState: event.prevState } : {}),
      ...(event.txnId ? { txnId: event.txnId } : {}),
      action: event.action,
    },
    "abdm session audit",
  );
}
