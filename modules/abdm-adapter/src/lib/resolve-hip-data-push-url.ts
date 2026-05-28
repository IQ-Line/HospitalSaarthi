import type { AbdmAdapterDeps } from "../ports.js";
import {
  isM3LoopbackHiu,
  m3AdapterPublicBaseUrl,
  m3DataPushNeverOverrideHosts,
} from "./m3-runtime-env.js";
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
 * Production: always CM-provided `dataPushUrl`.
 * Dev HIU loopback: may substitute stored adapter transfer URL unless CM host is on
 * `ABDM_M3_DATA_PUSH_NEVER_OVERRIDE_HOSTS` (default: apissbx.abdm.gov.in).
 */
export async function resolveHipDataPushUrl(
  input: { iqTenantId: string; consentId: string; cmDataPushUrl: string },
  deps: AbdmAdapterDeps,
): Promise<string> {
  if (isM3LoopbackHiu()) {
    return input.cmDataPushUrl;
  }

  const cmHost = hostnameOf(input.cmDataPushUrl);
  const neverOverride = m3DataPushNeverOverrideHosts();
  if (cmHost && neverOverride.includes(cmHost)) {
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
