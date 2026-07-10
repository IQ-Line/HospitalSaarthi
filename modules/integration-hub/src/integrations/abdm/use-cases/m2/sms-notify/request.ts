import { randomUUID } from "node:crypto";
import type { SmsNotifyRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import type { M2SmsNotifyContext } from "../../../domain/session.js";

export interface SmsNotifyRequestInput {
  phoneNo: string;
  hipName?: string;
}

export async function smsNotifyRequest(
  input: AbdmTenantInput<SmsNotifyRequestInput>,
  deps: AbdmAdapterDeps,
): Promise<{ sessionId: string; requestId: string }> {
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.sms-notify.v1",
    initialContext: {
      phoneNo: input.phoneNo,
      requestId,
    } satisfies M2SmsNotifyContext,
  });

  const body: SmsNotifyRequest = {
    requestId,
    timestamp,
    notification: {
      phoneNo: input.phoneNo,
      hip: {
        id: deps.xHipId,
        name: input.hipName ?? deps.hipDisplayName ?? "Hospital",
      },
    },
  };

  await deps.gateway.post({
    path: M2_GATEWAY_PATHS.smsNotify,
    body,
    target: "gateway",
    requestId,
    xHipId: deps.xHipId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "SMS_REQUESTED",
    requestId,
  });

  return { sessionId: session.sessionId, requestId };
}
