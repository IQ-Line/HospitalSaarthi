import type { NhaAbhaCardResponse } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { loadM1ProfileSession } from "../../lib/load-m1-profile-session.js";
import { nhaProfileXTokenHeaders } from "../../lib/nha-profile-headers.js";

export interface ProfileQrCodeHimsResponse {
  sessionId: string;
  qrCode: NhaAbhaCardResponse;
}

export async function profileQrCodeGetRequest(
  input: AbdmTenantInput<{ sessionId: string }>,
  deps: AbdmAdapterDeps,
): Promise<ProfileQrCodeHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const session = await loadM1ProfileSession(deps.sessions, iqTenantId, input.sessionId);
  const qrCode = await deps.gateway.get<NhaAbhaCardResponse>({
    path: "/v3/profile/account/qrCode",
    headers: nhaProfileXTokenHeaders(session.xToken!),
    responseParser: "abha-card",
  });
  return { sessionId: session.sessionId, qrCode };
}
