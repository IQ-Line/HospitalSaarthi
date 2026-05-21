import { afterEach, describe, expect, it } from "vitest";
import {
  resolveCallbackTenantId,
  resolveInboundRequestId,
} from "./resolve-callback-tenant.js";

describe("resolveCallbackTenantId", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("maps X-HIP-ID via ABDM_HIP_TENANT_MAP", () => {
    process.env["ABDM_HIP_TENANT_MAP"] = JSON.stringify({
      IN3610001625: "tenant-from-map",
    });
    delete process.env["ABDM_DEV_TENANT_ID"];
    expect(
      resolveCallbackTenantId({ "X-HIP-ID": "IN3610001625" }),
    ).toBe("tenant-from-map");
  });

  it("falls back to ABDM_DEV_TENANT_ID", () => {
    delete process.env["ABDM_HIP_TENANT_MAP"];
    process.env["ABDM_DEV_TENANT_ID"] = "dev-tenant";
    expect(resolveCallbackTenantId({})).toBe("dev-tenant");
  });
});

describe("resolveInboundRequestId", () => {
  it("prefers REQUEST-ID header", () => {
    expect(
      resolveInboundRequestId(
        { "REQUEST-ID": "hdr-id" },
        { response: { requestId: "body-id" } },
      ),
    ).toBe("hdr-id");
  });
});
