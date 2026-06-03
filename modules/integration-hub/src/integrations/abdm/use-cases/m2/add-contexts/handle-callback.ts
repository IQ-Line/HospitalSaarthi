import type { OnAddContextsCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { assertFlowKind } from "../../../domain/session.js";
import { createCareContextPublishedEnvelope } from "../../../lib/abdm-envelope.js";

export async function handleAddContextsCallback(
  input: AbdmTenantInput<
    OnAddContextsCallback & { gatewayRequestId: string }
  >,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findByFlowAndRequestId({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.add-contexts.v1",
    requestId: input.gatewayRequestId,
  });
  if (!session) return;

  assertFlowKind(session, "abdm.m2.add-contexts.v1");

  if (input.error) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: { error: input.error },
    });
    return;
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "COMPLETED",
  });

  if (deps.eventBus) {
    const ctx = session.context;
    await deps.eventBus.publish(
      createCareContextPublishedEnvelope(input.iqTenantId, {
        sessionId: session.sessionId,
        abhaAddress: ctx.abhaAddress,
        careContextReferences: ctx.careContextReferences,
      }),
    );
  }
}
