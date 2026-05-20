import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { OnLinkCareContextCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { assertFlowKind } from "../../../domain/session.js";
import { createCareContextLinkedEnvelope } from "../../../lib/abdm-envelope.js";
import { smsNotifyRequest } from "../sms-notify/request.js";

export async function handleHipLinkCallback(
  input: AbdmTenantInput<
    OnLinkCareContextCallback & { gatewayRequestId: string; abhaAddress: string }
  >,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findHipLinkByRequestId({
    iqTenantId: input.iqTenantId,
    requestId: input.gatewayRequestId,
  });
  if (!session) return;

  assertFlowKind(session, "abdm.m2.hip-initiated-link.v1");

  if ("error" in input && input.error) {
    const code = input.error.code;
    if (code === ABDM_ERROR_CODES.CARE_CONTEXTS_ALREADY_LINKED) {
      await deps.sessions.patch({
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        state: "LINKED",
      });
      return;
    }
    if (
      code === ABDM_ERROR_CODES.LINK_TOKEN_ABHA_MISMATCH ||
      code === ABDM_ERROR_CODES.LINK_TOKEN_ABHA_NUMBER_MISMATCH ||
      code === ABDM_ERROR_CODES.LINK_TOKEN_HIP_MISMATCH ||
      code === ABDM_ERROR_CODES.LINK_TOKEN_INVALID_JWT
    ) {
      await deps.linkTokens.invalidate(input.iqTenantId, input.abhaAddress);
    }
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
    state: "CC_LINK_CONFIRMED",
  });

  const ctx = session.context;
  for (const cc of ctx.careContexts) {
    await deps.recordFoundation.markCareContextLinked({
      iqTenantId: input.iqTenantId,
      careContextId: cc.referenceNumber,
    });
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINKED",
  });

  if (deps.eventBus) {
    await deps.eventBus.publish(
      createCareContextLinkedEnvelope(input.iqTenantId, {
        sessionId: session.sessionId,
        abhaAddress: ctx.abhaAddress,
        careContextReferences: ctx.careContexts.map((c) => c.referenceNumber),
      }),
    );
  }

  const phone =
    (ctx as { phoneNo?: string }).phoneNo ?? deps.defaultSmsPhoneNo;
  if (phone) {
    await smsNotifyRequest(
      { iqTenantId: input.iqTenantId, phoneNo: phone },
      deps,
    ).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "abdm.m2.hip_link.sms_notify_failed",
          sessionId: session.sessionId,
          phoneNo: phone,
          message,
        }),
      );
    });
  }
}
