import { randomUUID } from "node:crypto";
import type { AddContextsRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { toContextNotifyHiType } from "../../../lib/m2-hi-type-mapper.js";
import type { M2AddContextsContext } from "../../../domain/session.js";

export interface AddContextsPublishInput {
  abhaAddress: string;
  patientReference: string;
  careContextReference: string;
  hiType: string;
  eventDate?: string;
}

export async function addContextsPublish(
  input: AbdmTenantInput<AddContextsPublishInput>,
  deps: AbdmAdapterDeps,
): Promise<{ sessionId: string; requestId: string }> {
  const requestId = randomUUID();
  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.add-contexts.v1",
    initialContext: {
      abhaAddress: input.abhaAddress,
      patientReference: input.patientReference,
      careContextReferences: [input.careContextReference],
      hiType: input.hiType,
      notifyRequestId: requestId,
    } satisfies M2AddContextsContext,
  });

  const body: AddContextsRequest = {
    notification: {
      patient: { id: input.abhaAddress },
      careContext: {
        patientReference: input.patientReference,
        careContextReference: input.careContextReference,
      },
      hiTypes: [toContextNotifyHiType(input.hiType)],
      date: input.eventDate ?? new Date().toISOString(),
      hip: { id: deps.xHipId },
    },
  };

  await deps.gateway.post({
    path: M2_GATEWAY_PATHS.contextNotify,
    body,
    target: "gateway",
    requestId,
    xHipId: deps.xHipId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "NOTIFIED",
    requestId,
  });

  return { sessionId: session.sessionId, requestId };
}
