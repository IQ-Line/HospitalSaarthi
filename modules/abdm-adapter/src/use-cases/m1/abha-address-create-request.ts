import type {
  CreateAbhaAddressHimsRequest,
  CreateAbhaAddressHimsResponse,
  NhaCreateAbhaAddressBody,
  NhaCreateAbhaAddressResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { assertAadhaarEnrolMobileVerified } from "../../lib/m1-enrol-chain-guards.js";

export async function abhaAddressCreateRequest(
  input: AbdmTenantInput<CreateAbhaAddressHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<CreateAbhaAddressHimsResponse> {
  const iqTenantId = input.iqTenantId;
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
  assertAadhaarEnrolMobileVerified(session);
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
