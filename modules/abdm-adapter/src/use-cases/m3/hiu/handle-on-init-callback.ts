import type { OnConsentInitCallback } from "@hims/ts-sdk-abha/protocol/m3/hiu-consent-request.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { resolveM3ConsentRequestRow } from "./resolve-m3-consent-row.js";

export async function handleOnInitCallback(
  input: AbdmTenantInput<OnConsentInitCallback & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const cmConsentRequestId = input.consentRequest?.id;
  if (!cmConsentRequestId) return;

  const row = await resolveM3ConsentRequestRow(deps, input.iqTenantId, {
    cmConsentRequestId,
    gatewayRequestId: input.response?.requestId,
  });
  if (!row) return;

  const hasError = Boolean(input.error?.code || input.error?.message);
  const nextState = hasError ? "EXPIRED" : "AWAITING_PATIENT_APPROVAL";

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: row.sessionId,
    state: nextState,
    requestId: cmConsentRequestId,
    contextMerge: {
      consentRequestId: cmConsentRequestId,
      ...(hasError
        ? {
            error: {
              code: input.error?.code ?? "ON_INIT_ERROR",
              message: input.error?.message ?? "consent init failed",
            },
          }
        : {}),
    },
  });

  await deps.m3ConsentRequests.patch({
    iqTenantId: input.iqTenantId,
    consentRequestId: row.consentRequestId,
    state: nextState,
    contextMerge: { consentRequestId: cmConsentRequestId },
  });
}
