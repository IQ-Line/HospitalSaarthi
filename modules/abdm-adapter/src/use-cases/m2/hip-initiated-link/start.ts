import { randomUUID } from "node:crypto";
import { M2_HIP_INITIATED_LINK_STATES } from "@hims/ts-sdk-abha";
import type { LinkCareContextRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { LinkTokenNotAvailable, getOrAcquireLinkToken } from "../../../lib/link-token-cache.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { toLinkCareContextHiType } from "../../../lib/m2-hi-type-mapper.js";
import type { M2HipLinkContext } from "../../../domain/session.js";

export interface HipInitiatedLinkStartInput {
  abhaAddress: string;
  abhaNumber?: string;
  patientName: string;
  phoneNo?: string;
  gender: "M" | "F" | "O" | "D";
  yearOfBirth: number;
  careContexts: Array<{
    referenceNumber: string;
    display: string;
    hiType: string;
  }>;
}

export interface HipInitiatedLinkStartResult {
  sessionId: string;
  state: string;
}

export async function hipInitiatedLinkStart(
  input: AbdmTenantInput<HipInitiatedLinkStartInput>,
  deps: AbdmAdapterDeps,
): Promise<HipInitiatedLinkStartResult> {
  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.hip-initiated-link.v1",
    initialContext: {
      abhaAddress: input.abhaAddress,
      abhaNumber: input.abhaNumber,
      patientName: input.patientName,
      phoneNo: input.phoneNo,
      careContexts: input.careContexts,
    } satisfies M2HipLinkContext,
  });

  let linkToken: string;
  try {
    linkToken = await getOrAcquireLinkToken(
      {
        iqTenantId: input.iqTenantId,
        abhaAddress: input.abhaAddress,
        abhaNumber: input.abhaNumber,
        name: input.patientName,
        gender: input.gender,
        yearOfBirth: input.yearOfBirth,
      },
      deps,
    );
  } catch (e) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: {
          code: "LINK_TOKEN_UNAVAILABLE",
          message: e instanceof LinkTokenNotAvailable ? e.message : "token acquisition failed",
        },
      },
    });
    throw e;
  }

  const requestId = randomUUID();
  const hiType = toLinkCareContextHiType(
    input.careContexts[0]?.hiType ?? "OPCONSULTATION",
  ) as LinkCareContextRequest["patient"][0]["hiType"];
  const body: LinkCareContextRequest = {
    abhaAddress: input.abhaAddress,
    abhaNumber: input.abhaNumber,
    patient: [
      {
        referenceNumber: input.abhaAddress,
        display: input.patientName,
        careContexts: input.careContexts.map((c) => ({
          referenceNumber: c.referenceNumber,
          display: c.display,
        })),
        hiType,
        count: input.careContexts.length,
      },
    ],
  };

  await deps.gateway.post({
    path: M2_GATEWAY_PATHS.linkCareContext,
    body,
    target: "gateway",
    requestId,
    linkToken,
    xHipId: deps.xHipId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: M2_HIP_INITIATED_LINK_STATES[1],
    requestId,
    contextMerge: { ccLinkRequestId: requestId },
  });

  return { sessionId: session.sessionId, state: M2_HIP_INITIATED_LINK_STATES[1] };
}
