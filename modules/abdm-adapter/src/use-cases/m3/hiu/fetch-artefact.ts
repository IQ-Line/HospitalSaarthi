import { randomUUID } from "node:crypto";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3_GATEWAY_PATHS } from "../../../lib/m3-gateway-paths.js";
import { skipM3OutboundGateway } from "../../../lib/m3-runtime-env.js";

export async function fetchConsentArtefact(
  input: AbdmTenantInput<{ consentId: string; consentRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  if (skipM3OutboundGateway()) return;

  await deps.gateway.post({
    path: M3_GATEWAY_PATHS.consentFetch,
    body: { consentId: input.consentId },
    target: "gateway",
    requestId: randomUUID(),
    headers: { "X-HIU-ID": deps.xHiuId },
  });
}
