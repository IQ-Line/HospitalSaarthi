import type { OnGenerateTokenSuccessCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { LinkTokensPort } from "../ports.js";
import { decodeLinkTokenPayload } from "./decode-link-token-exp.js";

type TokenCallbackBody = OnGenerateTokenSuccessCallback & {
  abhaAddress?: string;
  abha_address?: string;
};

function abhaFromJwtClaims(linkToken: string): string | null {
  const fromJwt = decodeLinkTokenPayload(linkToken);
  if (!fromJwt) return null;
  const candidates = [
    fromJwt.abhaAddress,
    fromJwt.abha_address,
    fromJwt.preferred_username,
    fromJwt.abha,
    fromJwt.sub,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v && v.includes("@")) return v;
  }
  return null;
}

/** Sandbox payloads may omit top-level `abhaAddress`; try JWT claims / aliases. */
export function resolveAbhaAddressFromTokenCallback(
  body: TokenCallbackBody,
): string | null {
  const top = body.abhaAddress?.trim() || body.abha_address?.trim();
  if (top) return top;
  if ("linkToken" in body && typeof body.linkToken === "string" && body.linkToken) {
    return abhaFromJwtClaims(body.linkToken);
  }
  return null;
}

/**
 * Resolves ABHA for `on-generate-token` when the body omits it (common in sandbox).
 * Falls back to `abdm_link_tokens.pending_request_id` = `response.requestId`.
 */
export async function resolveAbhaAddressForTokenCallback(
  input: {
    iqTenantId: string;
    body: TokenCallbackBody;
    linkTokens: LinkTokensPort;
  },
): Promise<string | null> {
  const fromBody = resolveAbhaAddressFromTokenCallback(input.body);
  if (fromBody) return fromBody;

  const requestId = input.body.response?.requestId?.trim();
  if (!requestId) return null;

  return input.linkTokens.findAbhaAddressByPendingRequestId(
    input.iqTenantId,
    requestId,
  );
}
