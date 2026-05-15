import type { NhaAbhaCardResponse, ProfileAbhaCardHimsResponse } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { loadM1ProfileSession } from "../../lib/load-m1-profile-session.js";
import { nhaProfileXTokenHeaders } from "../../lib/nha-profile-headers.js";

export async function profilePhrCardGetRequest(
  input: { sessionId: string },
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<ProfileAbhaCardHimsResponse> {
  const session = await loadM1ProfileSession(deps.sessions, iqTenantId, input.sessionId);
  const card = await deps.gateway.get<NhaAbhaCardResponse>({
    path: "/v3/profile/account/phr-card",
    headers: nhaProfileXTokenHeaders(session.xToken!),
    responseParser: "abha-card",
  });
  return { sessionId: session.sessionId, card };
}
