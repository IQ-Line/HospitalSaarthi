import type { NhaProfileAccountResponse, ProfileAccountHimsResponse } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { loadM1ProfileSession } from "../../lib/load-m1-profile-session.js";
import { nhaProfileXTokenHeaders } from "../../lib/nha-profile-headers.js";

export async function profileAccountGetRequest(
  input: { sessionId: string },
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<ProfileAccountHimsResponse> {
  const session = await loadM1ProfileSession(deps.sessions, iqTenantId, input.sessionId);
  const profile = await deps.gateway.get<NhaProfileAccountResponse>({
    path: "/v3/profile/account",
    headers: nhaProfileXTokenHeaders(session.xToken!),
  });
  return { sessionId: session.sessionId, profile };
}
