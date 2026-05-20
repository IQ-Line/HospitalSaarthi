import type { OnGenerateTokenSuccessCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import { decodeLinkTokenPayload } from "./decode-link-token-exp.js";

type TokenCallbackBody = OnGenerateTokenSuccessCallback & {
  abhaAddress?: string;
  abha_address?: string;
};

/** Sandbox payloads may omit top-level `abhaAddress`; try JWT `sub` / aliases. */
export function resolveAbhaAddressFromTokenCallback(
  body: TokenCallbackBody,
): string | null {
  const top = body.abhaAddress?.trim() || body.abha_address?.trim();
  if (top) return top;
  if ("linkToken" in body && typeof body.linkToken === "string" && body.linkToken) {
    const fromJwt = decodeLinkTokenPayload(body.linkToken);
    const sub = fromJwt?.sub?.trim();
    if (sub) return sub;
    const nested = fromJwt?.abhaAddress?.trim() || fromJwt?.abha_address?.trim();
    if (nested) return nested;
  }
  return null;
}
