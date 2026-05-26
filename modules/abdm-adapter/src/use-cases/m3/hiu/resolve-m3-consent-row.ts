import type { AbdmAdapterDeps, M3ConsentRequestRow } from "../../../ports.js";

/** CM `consentRequest.id` / notify `consentRequestId` (UUID), not local `REQ-*` row key. */
export function cmConsentRequestIdFromContext(
  context: Record<string, unknown>,
): string | undefined {
  const id = context["consentRequestId"];
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

export async function resolveM3ConsentRequestRow(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  keys: {
    cmConsentRequestId?: string;
    gatewayRequestId?: string;
    sessionId?: string;
  },
): Promise<M3ConsentRequestRow | null> {
  const cmId = keys.cmConsentRequestId?.trim();
  if (cmId) {
    const direct = await deps.m3ConsentRequests.findByConsentRequestId({
      iqTenantId,
      consentRequestId: cmId,
    });
    if (direct) return direct;

    const session = await deps.sessions.findByFlowAndRequestId({
      iqTenantId,
      flowKind: "abdm.m3.hiu.v1",
      requestId: cmId,
    });
    if (session) {
      return deps.m3ConsentRequests.findBySessionId({
        iqTenantId,
        sessionId: session.sessionId,
      });
    }

    const active = await deps.m3ConsentRequests.listActive(iqTenantId);
    const byContext = active.find(
      (r) => cmConsentRequestIdFromContext(r.context) === cmId,
    );
    if (byContext) return byContext;
  }

  const gwId = keys.gatewayRequestId?.trim();
  if (gwId) {
    const session = await deps.sessions.findByFlowAndRequestId({
      iqTenantId,
      flowKind: "abdm.m3.hiu.v1",
      requestId: gwId,
    });
    if (session) {
      return deps.m3ConsentRequests.findBySessionId({
        iqTenantId,
        sessionId: session.sessionId,
      });
    }
  }

  if (keys.sessionId) {
    return deps.m3ConsentRequests.findBySessionId({
      iqTenantId,
      sessionId: keys.sessionId,
    });
  }

  return null;
}
