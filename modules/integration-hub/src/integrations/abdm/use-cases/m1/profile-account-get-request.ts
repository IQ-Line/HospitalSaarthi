import type { NhaProfileAccountResponse, ProfileAccountHimsResponse } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { loadM1ProfileSession } from "../../lib/load-m1-profile-session.js";
import {
  nhaProfileResourcePath,
  resolveSessionProfileApiVariant,
} from "../../lib/m1-nha-profile-paths.js";
import { nhaProfileXTokenHeaders } from "../../lib/nha-profile-headers.js";

export async function profileAccountGetRequest(
  input: AbdmTenantInput<{ sessionId: string }>,
  deps: AbdmAdapterDeps,
): Promise<ProfileAccountHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const session = await loadM1ProfileSession(deps.sessions, iqTenantId, input.sessionId);
  const variant = resolveSessionProfileApiVariant(session);
  const profile = await deps.gateway.get<NhaProfileAccountResponse>({
    path: nhaProfileResourcePath(variant, "account"),
    headers: nhaProfileXTokenHeaders(session.xToken!),
  });
  return { sessionId: session.sessionId, profile };
}
