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

/** Keys safe to expose on GET /m2/sessions/:id (allowlist — no tokens or raw NHA bodies). */
const PUBLISHABLE_CONTEXT_KEYS = new Set([
  "abhaAddress",
  "abhaNumber",
  "patientId",
  "patientName",
  "phoneNo",
  "careContexts",
  "consentId",
  "transactionId",
  "dataPushUrl",
  "requestId",
  "linkRefNumber",
  "ccLinkRequestId",
  "tokenReady",
  "patientReference",
  "careContextReferences",
  "hiType",
  "notifyRequestId",
  "abhaAddressSuggestions",
  "aadhaarMasked",
  "abhaNumberMasked",
  "mobileMasked",
  "verifyChannel",
  "loginScopes",
  "loginApiVariant",
  "needsUserSelection",
  "accounts",
  "nhaOtpMessage",
  "identifiers",
]);

function summarizeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLISHABLE_CONTEXT_KEYS) {
    if (key in ctx) {
      out[key] = ctx[key];
    }
  }
  if (ctx.error && typeof ctx.error === "object") {
    const err = ctx.error as Record<string, unknown>;
    out.error = {
      code: err.code,
      message: err.message,
    };
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
