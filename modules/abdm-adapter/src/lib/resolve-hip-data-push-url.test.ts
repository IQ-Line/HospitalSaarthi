import { afterEach, describe, expect, it, vi } from "vitest";
import type { AbdmAdapterDeps } from "../ports.js";
import { resolveHipDataPushUrl } from "./resolve-hip-data-push-url.js";

describe("resolveHipDataPushUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses HIU transfer dataPushUrl when CM points at PHR", async () => {
    vi.stubEnv("ABDM_ADAPTER_PUBLIC_BASE_URL", "https://bridge.example");
    vi.stubEnv("ABDM_M3_LOOPBACK_HIU", "false");

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
        cmDataPushUrl:
          "https://apissbx.abdm.gov.in/hip/patient-hiu/v3/health-information/transfer/x",
      },
      deps,
    );

    expect(url).toContain("bridge.example");
    expect(url).toContain("cfa7c0cb");
  });
});
