import type { AbdmAdapterDeps } from "../ports.js";
import { isM3LoopbackHiu, m3AdapterPublicBaseUrl } from "./m3-runtime-env.js";
import { abdmWarn } from "./abdm-adapter-log.js";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CM `hiRequest.dataPushUrl` often targets PHR. When this adapter is also the HIU, push to the
 * ngrok/local URL stored on `m3_data_transfers` from `start-data-request` instead.
 */
export async function resolveHipDataPushUrl(
  input: { iqTenantId: string; consentId: string; cmDataPushUrl: string },
  deps: AbdmAdapterDeps,
): Promise<string> {
  if (isM3LoopbackHiu()) {
    return input.cmDataPushUrl;
  }

  const adapterHost = hostnameOf(m3AdapterPublicBaseUrl());
  const cmHost = hostnameOf(input.cmDataPushUrl);
  if (adapterHost && cmHost && (cmHost === adapterHost || cmHost === "localhost")) {
    return input.cmDataPushUrl;
  }

  const transfer = await deps.m3DataTransfers.findLatestActiveByConsentId(
    input.iqTenantId,
    input.consentId,
  );
  if (transfer?.dataPushUrl) {
    abdmWarn("abdm.m3.hip_push.data_push_url_override", {
      cmUrl: input.cmDataPushUrl,
      adapterUrl: transfer.dataPushUrl,
      transferId: transfer.transferId,
    });
    return transfer.dataPushUrl;
  }

  return input.cmDataPushUrl;
}
