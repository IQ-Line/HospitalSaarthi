import type { OnHiuDataRequestCallback } from "@hims/ts-sdk-abha/protocol/m3";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";

const AWAITING_PUSH_HOURS = Number(process.env["ABDM_M3_AWAITING_PUSH_HOURS"] ?? 24);

export async function handleOnDataRequestCallback(
  input: AbdmTenantInput<OnHiuDataRequestCallback & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const outboundId = input.response?.requestId;
  if (!outboundId) return;

  const transfer = await deps.m3DataTransfers.findByOutboundRequestId({
    iqTenantId: input.iqTenantId,
    outboundRequestId: outboundId,
  });
  if (!transfer) return;

  const hasError = Boolean(input.error?.code || input.error?.message);
  if (hasError) {
    await deps.m3DataTransfers.patch({
      iqTenantId: input.iqTenantId,
      transferId: transfer.transferId,
      state: M3Hiu.EXPIRED,
      error: {
        code: input.error?.code ?? "ON_REQUEST_ERROR",
        message: input.error?.message ?? "data request rejected",
      },
    });
    return;
  }

  const cmTransactionId = input.hiRequest?.transactionId;
  const awaitingUntil = new Date(Date.now() + AWAITING_PUSH_HOURS * 3600000);

  await deps.m3DataTransfers.patch({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    state: M3Hiu.AWAITING_PUSH,
    cmTransactionId: cmTransactionId ?? null,
    awaitingPushUntil: awaitingUntil,
  });

  if (transfer.sessionId) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: transfer.sessionId,
      state: M3Hiu.AWAITING_PUSH,
      contextMerge: {
        cmTransactionId,
        transferId: transfer.transferId,
      },
    });
  }
}
