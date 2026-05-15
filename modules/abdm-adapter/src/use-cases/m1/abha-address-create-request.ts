import type {
  CreateAbhaAddressHimsRequest,
  CreateAbhaAddressHimsResponse,
  NhaCreateAbhaAddressBody,
  NhaCreateAbhaAddressResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function abhaAddressCreateRequest(
  input: CreateAbhaAddressHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<CreateAbhaAddressHimsResponse> {
  const addr = String(input.abhaAddress ?? "").trim();
  if (addr.length < 3 || addr.length > 64) {
    throw new AbdmUseCaseError("abhaAddress length invalid", 400);
  }
  /** NHA `/v3/enrollment/enrol/abha-address` only documents `preferred: 1` (other values → upstream 400). */
  const preferred = input.preferred ?? 1;
  if (preferred !== 1) {
    throw new AbdmUseCaseError(
      "preferred must be 1 (omit the field to default to 1); NHA does not accept 0",
      400,
    );
  }
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
  const body: NhaCreateAbhaAddressBody = {
    txnId: session.txnId,
    abhaAddress: addr,
    preferred,
  };
  const nha = await deps.gateway.post<NhaCreateAbhaAddressBody, NhaCreateAbhaAddressResponse>({
    path: "/v3/enrollment/enrol/abha-address",
    body,
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : session.txnId;
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "ADDRESS_CREATED",
    txnId,
    contextMerge: {
      preferredAbhaAddress: nha.preferredAbhaAddress,
      healthIdNumberAfterAddress: nha.healthIdNumber,
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    healthIdNumber: nha.healthIdNumber,
    preferredAbhaAddress: nha.preferredAbhaAddress,
  };
}
