import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { getAbdmSession } from "../sessions/get-session.js";

export interface LinkTokenStatusResult {
  sessionId?: string;
  abhaAddress: string;
  state: "TOKEN_REQUESTED" | "TOKEN_AVAILABLE" | "FAILED" | "NOT_FOUND";
  tokenReady: boolean;
  tokenExpiresAt?: string;
  message?: string;
}

/**
 * HIS observability for pre-mint: poll by `sessionId` (from acquire) or `abhaAddress` (cache only).
 */
export async function getLinkTokenStatus(
  input: AbdmTenantInput<{ sessionId?: string; abhaAddress?: string }>,
  deps: Pick<AbdmAdapterDeps, "sessions" | "linkTokens" | "payloadEncryptor">,
): Promise<LinkTokenStatusResult> {
  const abhaAddress = input.abhaAddress?.trim();
  const sessionId = input.sessionId?.trim();

  if (!sessionId && !abhaAddress) {
    return {
      abhaAddress: "",
      state: "NOT_FOUND",
      tokenReady: false,
      message: "sessionId or abhaAddress required",
    };
  }

  const cached =
    abhaAddress != null && abhaAddress.length > 0
      ? await deps.linkTokens.findFresh(input.iqTenantId, abhaAddress)
      : null;
  const cacheReady =
    cached != null && deps.payloadEncryptor.decrypt(cached.linkToken) != null;

  if (sessionId) {
    const session = await getAbdmSession(
      { iqTenantId: input.iqTenantId, sessionId },
      deps,
    );
    if (!session) {
      return {
        sessionId,
        abhaAddress: abhaAddress ?? "",
        state: "NOT_FOUND",
        tokenReady: cacheReady,
        tokenExpiresAt: cached?.expiresAt.toISOString(),
      };
    }
    const ctx = session.context;
    const addr =
      (typeof ctx.abhaAddress === "string" ? ctx.abhaAddress : "") ||
      abhaAddress ||
      "";
    const ctxReady = ctx.tokenReady === true;
    const ready = cacheReady || ctxReady || session.state === "TOKEN_AVAILABLE";
    return {
      sessionId,
      abhaAddress: addr,
      state: session.state as LinkTokenStatusResult["state"],
      tokenReady: ready,
      tokenExpiresAt: cached?.expiresAt.toISOString(),
      message:
        typeof ctx.error === "object" &&
        ctx.error &&
        typeof (ctx.error as { message?: string }).message === "string"
          ? (ctx.error as { message: string }).message
          : undefined,
    };
  }

  return {
    abhaAddress: abhaAddress!,
    state: cacheReady ? "TOKEN_AVAILABLE" : "TOKEN_REQUESTED",
    tokenReady: cacheReady,
    tokenExpiresAt: cached?.expiresAt.toISOString(),
  };
}
