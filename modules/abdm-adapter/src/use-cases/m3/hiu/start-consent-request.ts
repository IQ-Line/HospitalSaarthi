import { randomUUID } from "node:crypto";
import type { HiTypePascal, PurposeCode } from "@hims/ts-sdk-abha/protocol/m3/common.js";
import type { ConsentRequestInitBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-consent-request.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3_GATEWAY_PATHS } from "../../../lib/m3-gateway-paths.js";
import {
  formatNhaCmTimestamp,
  normalizeConsentPermissionDateRange,
  validateConsentPermissionDateRange,
} from "../../../lib/nha-cm-timestamp.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { skipM3OutboundGateway } from "../../../lib/m3-runtime-env.js";
import type { M3HiuContext } from "./context.js";

const PURPOSE_TEXT: Record<PurposeCode, string> = {
  CAREMGT: "Care Management",
  BTG: "Break the Glass",
  PUBHLTH: "Public Health",
  HPAYMT: "Healthcare Payment",
  DSRCH: "Disease Specific Healthcare Research",
  PATRQT: "Self Requested",
};

export interface StartConsentRequestInput {
  patientAbhaAddress: string;
  hipId?: string;
  purpose: PurposeCode;
  hiTypes: HiTypePascal[];
  dateRange: { from: string; to: string };
  dataEraseAt?: string;
  requesterName?: string;
  requesterRegNo?: string;
}

export interface StartConsentRequestResult {
  sessionId: string;
  state: string;
}

export async function startConsentRequest(
  input: AbdmTenantInput<StartConsentRequestInput>,
  deps: AbdmAdapterDeps,
): Promise<StartConsentRequestResult> {
  const normalizedRange = normalizeConsentPermissionDateRange(input.dateRange);
  if (normalizedRange.adjustedToFromMidnight) {
    abdmWarn("abdm.m3.consent.date_range_to_normalized", {
      from: input.dateRange.to,
      to: normalizedRange.to,
    });
  }
  validateConsentPermissionDateRange(normalizedRange);
  const permissionDateRange = {
    from: formatNhaCmTimestamp(normalizedRange.from),
    to: formatNhaCmTimestamp(normalizedRange.to),
  };
  const dataEraseAt = formatNhaCmTimestamp(
    input.dataEraseAt ??
      new Date(
        new Date(permissionDateRange.to).getTime() + 90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
  );

  if (new Date(dataEraseAt).getTime() <= Date.now()) {
    throw new Error("dataEraseAt must be in the future");
  }

  const provisionalRequestId = `REQ-${randomUUID()}`;
  const outboundRequestId = randomUUID();
  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m3.hiu.v1",
    initialContext: {
      consentRequestId: provisionalRequestId,
      dateRange: permissionDateRange,
      outboundRequestId,
    } satisfies M3HiuContext,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "CONSENT_INIT_REQUESTED",
    requestId: outboundRequestId,
  });

  const initBody: ConsentRequestInitBody = {
    consent: {
      purpose: {
        text: PURPOSE_TEXT[input.purpose],
        code: input.purpose,
        refUri: "www.abdm.gov.in",
      },
      patient: { id: input.patientAbhaAddress },
      ...(input.hipId ? { hip: { id: input.hipId } } : {}),
      hiu: { id: deps.xHiuId },
      requester: {
        name: input.requesterName?.trim() || "Hospital Staff",
        identifier: {
          type: "REGNO",
          value: input.requesterRegNo?.trim() ?? "",
          system: "https://www.mciindia.org",
        },
      },
      hiTypes: input.hiTypes,
      permission: {
        accessMode: "VIEW",
        dateRange: permissionDateRange,
        dataEraseAt,
        frequency: { unit: "HOUR", value: 1, repeats: 0 },
      },
    },
  };

  if (!skipM3OutboundGateway()) {
    await deps.gateway.post({
      path: M3_GATEWAY_PATHS.consentRequestInit,
      body: initBody,
      target: "gateway",
      requestId: outboundRequestId,
      headers: { "X-HIU-ID": deps.xHiuId },
    });
  }

  await deps.m3ConsentRequests.insert({
    iqTenantId: input.iqTenantId,
    consentRequestId: provisionalRequestId,
    sessionId: session.sessionId,
    patientAbhaAddress: input.patientAbhaAddress,
    hipId: input.hipId ?? null,
    purposeCode: input.purpose,
    hiTypes: input.hiTypes,
    permissionDateFrom: new Date(permissionDateRange.from),
    permissionDateTo: new Date(permissionDateRange.to),
    dataEraseAt: new Date(dataEraseAt),
    state: "CONSENT_INIT_REQUESTED",
    consentArtefactIds: [],
    context: { outboundRequestId },
  });

  return { sessionId: session.sessionId, state: "CONSENT_INIT_REQUESTED" };
}
