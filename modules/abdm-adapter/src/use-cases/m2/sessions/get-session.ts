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

const RAW_CONTEXT_KEYS = new Set([
  "gatewayResponse",
  "upstreamResponse",
  "rawError",
  "nhaResponse",
]);

function summarizeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (RAW_CONTEXT_KEYS.has(key)) continue;
    if (key === "error" && value && typeof value === "object") {
      const err = value as Record<string, unknown>;
      out[key] = {
        code: err.code,
        message: err.message,
      };
      continue;
    }
    out[key] = value;
  }
  return out;
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
  const ctx = summarizeContext({ ...(row.context as Record<string, unknown>) });
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
