import type {
  AbhaAddressSuggestionsHimsResponse,
  NhaAbhaAddressSuggestionResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function abhaAddressSuggestionsRequest(
  input: { sessionId: string },
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<AbhaAddressSuggestionsHimsResponse> {
  const session = await deps.sessions.findById({
    iqTenantId,
    sessionId: input.sessionId,
  });
  if (!session) {
    throw new AbdmUseCaseError("session not found", 404, "NOT_FOUND");
  }
  if (session.flowKind !== "abdm.m1.aadhaar-otp.v1") {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
  if (session.state !== "ABHA_CREATED") {
    throw new AbdmUseCaseError(
      `session state must be ABHA_CREATED, got ${session.state}`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
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
