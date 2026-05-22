import type { OnGenerateTokenCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { completeLinkTokenFromCallback } from "../../../lib/link-token-cache.js";

export async function handleTokenCallback(
  input: AbdmTenantInput<OnGenerateTokenCallback & { abhaAddress: string }>,
  deps: Pick<AbdmAdapterDeps, "linkTokens" | "payloadEncryptor">,
): Promise<void> {
  const requestId =
    ("response" in input && input.response?.requestId) ||
    ("requestId" in input && typeof input.requestId === "string"
      ? input.requestId
      : undefined);

  if ("error" in input && input.error) {
    abdmWarn("abdm.m2.link_token.callback_rejected", {
      abhaAddress: input.abhaAddress,
      requestId,
      reason: "gateway_error",
      errorCode: input.error.code,
    });
    return;
  }
  if (!("linkToken" in input) || !input.linkToken) {
    abdmWarn("abdm.m2.link_token.callback_rejected", {
      abhaAddress: input.abhaAddress,
      requestId,
      reason: "missing_link_token",
    });
    return;
  }
  const token = input.linkToken.trim();
  // Real NHA link tokens are long RS* JWTs; reject short/mock values (e.g. local curl tests).
  if (token.split(".").length !== 3 || token.length < 100) {
    abdmWarn("abdm.m2.link_token.callback_rejected", {
      abhaAddress: input.abhaAddress,
      requestId,
      reason: "invalid_link_token_shape",
      tokenLength: token.length,
    });
    return;
  }
  await completeLinkTokenFromCallback(
    {
      iqTenantId: input.iqTenantId,
      abhaAddress: input.abhaAddress,
      linkToken: token,
    },
    deps,
  );
}
