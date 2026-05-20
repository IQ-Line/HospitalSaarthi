import type { OnGenerateTokenCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { completeLinkTokenFromCallback } from "../../../lib/link-token-cache.js";

export async function handleTokenCallback(
  input: AbdmTenantInput<OnGenerateTokenCallback & { abhaAddress: string }>,
  deps: Pick<AbdmAdapterDeps, "linkTokens" | "payloadEncryptor">,
): Promise<void> {
  if ("error" in input && input.error) {
    return;
  }
  if (!("linkToken" in input) || !input.linkToken) {
    return;
  }
  const token = input.linkToken.trim();
  // Real NHA link tokens are long RS* JWTs; reject short/mock values (e.g. local curl tests).
  if (token.split(".").length !== 3 || token.length < 100) {
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
