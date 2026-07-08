import type { OnSmsNotifyCallback } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { assertFlowKind } from "../../../domain/session.js";

export async function handleSmsNotifyCallback(
  input: AbdmTenantInput<OnSmsNotifyCallback & { gatewayRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findByFlowAndRequestId({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.sms-notify.v1",
    requestId: input.gatewayRequestId,
  });
  if (!session) return;

  assertFlowKind(session, "abdm.m2.sms-notify.v1");

  if (input.error) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
    });
    return;
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "SMS_ACKED",
  });
}
