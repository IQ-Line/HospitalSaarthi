import { describe, expect, it } from "vitest";
import { nhaProfileResourcePath } from "../../../../../src/integrations/abdm/lib/m1-nha-profile-paths.js";

describe("nhaProfileResourcePath", () => {
  it("uses profile/account for standard enrol and ABHA-number login tokens", () => {
    expect(nhaProfileResourcePath("profile", "account")).toBe("/v3/profile/account");
    expect(nhaProfileResourcePath("profile", "abha-card")).toBe("/v3/profile/account/abha-card");
  });

  it("uses PHR web login profile paths for ABHA-address verification (Postman)", () => {
    expect(nhaProfileResourcePath("phr-abha", "account")).toBe(
      "/v3/phr/web/login/profile/abha-profile",
    );
    expect(nhaProfileResourcePath("phr-abha", "phr-card")).toBe(
      "/v3/phr/web/login/profile/abha/phr-card",
    );
    expect(nhaProfileResourcePath("phr-abha", "abha-card")).toBe(
      "/v3/phr/web/login/profile/abha/phr-card",
    );
    expect(nhaProfileResourcePath("phr-abha", "qr-code")).toBe("/v3/phr/web/profile/qrCode");
  });
});
