import type {
  AbhaAddressSuggestionsHimsResponse,
  NhaAbhaAddressSuggestionResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { assertAadhaarEnrolMobileVerified } from "../../lib/m1-enrol-chain-guards.js";

export async function abhaAddressSuggestionsRequest(
  input: AbdmTenantInput<{ sessionId: string }>,
  deps: AbdmAdapterDeps,
): Promise<AbhaAddressSuggestionsHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const session = await deps.sessions.findById({
    iqTenantId,
    sessionId: input.sessionId,
  });
  if (!session) {
    throw new AbdmUseCaseError("session not found", 404, "NOT_FOUND");
  }
  assertAadhaarEnrolMobileVerified(session);
  const nha = await deps.gateway.get<NhaAbhaAddressSuggestionResponse>({
    path: "/v3/enrollment/enrol/suggestion",
    headers: { Transaction_Id: session.txnId },
  });
  const suggestions = Array.isArray(nha.abhaAddressList) ? nha.abhaAddressList : [];
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : "";
  if (!txnId) {
    throw new Error("NHA enrol/suggestion response missing txnId");
  }
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    txnId,
    contextMerge: { abhaAddressSuggestions: suggestions },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    suggestions,
  };
}
