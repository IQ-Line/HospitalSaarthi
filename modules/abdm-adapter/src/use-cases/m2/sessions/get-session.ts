import type { AbdmSession } from "../../../domain/session.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";

export interface AbdmSessionStatusView {
  sessionId: string;
  flowKind: string;
  state: string;
  txnId: string | null;
  requestId: string | null;
  context: Record<string, unknown>;
  updatedAt: string;
}

/** Poll HIP/M2/M3 flow progress by platform-issued session id. */
export async function getAbdmSession(
  input: AbdmTenantInput<{ sessionId: string }>,
  deps: Pick<AbdmAdapterDeps, "sessions">,
): Promise<AbdmSessionStatusView | null> {
  const row = await deps.sessions.findById({
    iqTenantId: input.iqTenantId,
    sessionId: input.sessionId,
  });
  if (!row) return null;
  const ctx = { ...(row.context as Record<string, unknown>) };
  delete ctx.expiresAt;
  return {
    sessionId: row.sessionId,
    flowKind: row.flowKind,
    state: row.state,
    txnId: row.txnId,
    requestId: row.requestId,
    context: ctx,
    updatedAt: row.updatedAt.toISOString(),
  };
}
