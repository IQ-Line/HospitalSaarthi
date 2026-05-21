import { describe, expect, it } from "vitest";
import {
  BILLING_TARIFF_DEV_TENANT_ID,
  EMPI_DEV_PLACEHOLDER_TENANT_ID,
  resolveBillingRequestTenantId,
} from "./resolve-billing-tenant-id.js";

describe("resolveBillingRequestTenantId", () => {
  it("remaps EMPI dev placeholder to tariff dev tenant in non-production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.BILLING_DEV_TENANT_ID = BILLING_TARIFF_DEV_TENANT_ID;

    expect(
      resolveBillingRequestTenantId(
        { iq_tenant_id: EMPI_DEV_PLACEHOLDER_TENANT_ID },
        "00000000-0000-0000-0000-000000000007",
      ),
    ).toBe(BILLING_TARIFF_DEV_TENANT_ID);

    process.env.NODE_ENV = prev;
  });

  it("passes through canonical tenant headers", () => {
    expect(
      resolveBillingRequestTenantId(
        { "x-tenant-id": BILLING_TARIFF_DEV_TENANT_ID },
        "00000000-0000-0000-0000-000000000007",
      ),
    ).toBe(BILLING_TARIFF_DEV_TENANT_ID);
  });
});
