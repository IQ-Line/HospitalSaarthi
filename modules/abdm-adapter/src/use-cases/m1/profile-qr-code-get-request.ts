import type { NhaAbhaCardResponse } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { loadM1ProfileSession } from "../../lib/load-m1-profile-session.js";
import {
  nhaProfileResourcePath,
  resolveSessionProfileApiVariant,
} from "../../lib/m1-nha-profile-paths.js";
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
  const variant = resolveSessionProfileApiVariant(session);
  const qrCode = await deps.gateway.get<NhaAbhaCardResponse>({
    path: nhaProfileResourcePath(variant, "qr-code"),
    headers: nhaProfileXTokenHeaders(session.xToken!),
    responseParser: "abha-card",
  });
  return { sessionId: session.sessionId, qrCode };
}
