import { afterEach, describe, expect, it, vi } from "vitest";
import type { AbdmAdapterDeps } from "../../../../../src/integrations/abdm/ports.js";
import { resolveHipDataPushUrl } from "../../../../../src/integrations/abdm/lib/resolve-hip-data-push-url.js";

describe("resolveHipDataPushUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production/non-loopback always keeps CM dataPushUrl even when transfer row exists", async () => {
    vi.stubEnv("ABDM_ADAPTER_PUBLIC_BASE_URL", "https://bridge.example");
    vi.stubEnv("ABDM_M3_LOOPBACK_HIU", "false");

    const cmUrl = "https://webhook.site/some-hiu-push";
    const deps = {
      m3DataTransfers: {
        findLatestActiveByConsentId: vi.fn().mockResolvedValue({
          transferId: "cfa7c0cb-592a-45d5-b7fb-758fab8c6c7e",
          dataPushUrl:
            "https://bridge.example/api/v3/hiu/health-information/transfer/cfa7c0cb-592a-45d5-b7fb-758fab8c6c7e",
        }),
      },
    } as unknown as AbdmAdapterDeps;

    const url = await resolveHipDataPushUrl(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        consentId: "01953e37-7464-43a5-b66e-3e8492d71e64",
        cmDataPushUrl: cmUrl,
      },
      deps,
    );

    expect(url).toBe(cmUrl);
    expect(deps.m3DataTransfers.findLatestActiveByConsentId).not.toHaveBeenCalled();
  });

  it("loopback rewrites external CM URL to stored adapter HIU transfer URL", async () => {
    vi.stubEnv("ABDM_ADAPTER_PUBLIC_BASE_URL", "https://bridge.example");
    vi.stubEnv("ABDM_M3_LOOPBACK_HIU", "true");

    const cmUrl =
      "https://apissbx.abdm.gov.in/abha/api/v3/patient-hiu/app/v0.5/health-information/transfer";
    const adapterUrl =
      "https://bridge.example/api/v3/hiu/health-information/transfer/cfa7c0cb-592a-45d5-b7fb-758fab8c6c7e";

    const deps = {
      m3DataTransfers: {
        findLatestActiveByConsentId: vi.fn().mockResolvedValue({
          transferId: "cfa7c0cb-592a-45d5-b7fb-758fab8c6c7e",
          dataPushUrl: adapterUrl,
        }),
      },
    } as unknown as AbdmAdapterDeps;

    const url = await resolveHipDataPushUrl(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        consentId: "01953e37-7464-43a5-b66e-3e8492d71e64",
        cmDataPushUrl: cmUrl,
      },
      deps,
    );

    expect(url).toBe(adapterUrl);
  });
});
