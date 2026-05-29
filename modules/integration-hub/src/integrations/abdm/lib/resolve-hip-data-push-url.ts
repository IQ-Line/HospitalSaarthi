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
 * Resolve outbound HIP data-push URL.
 * Production/non-loopback: always CM-provided `dataPushUrl`.
 * Loopback: redirect external CM URLs to stored adapter HIU transfer endpoint.
 */
export async function resolveHipDataPushUrl(
  input: { iqTenantId: string; consentId: string; cmDataPushUrl: string },
  deps: AbdmAdapterDeps,
): Promise<string> {
  if (!isM3LoopbackHiu()) {
    return input.cmDataPushUrl;
  }

  const transfer = await deps.m3DataTransfers.findLatestActiveByConsentId(
    input.iqTenantId,
    input.consentId,
  );
  if (!transfer?.dataPushUrl) {
    return input.cmDataPushUrl;
  }

  const cmHost = hostnameOf(input.cmDataPushUrl);
  const adapterHost = hostnameOf(m3AdapterPublicBaseUrl());
  if (cmHost && adapterHost && cmHost !== adapterHost) {
    abdmWarn("abdm.m3.hip_push.data_push_url_loopback_rewrite", {
      cmUrl: input.cmDataPushUrl,
      adapterUrl: transfer.dataPushUrl,
      transferId: transfer.transferId,
    });
    return transfer.dataPushUrl;
  }

  return input.cmDataPushUrl;
}
