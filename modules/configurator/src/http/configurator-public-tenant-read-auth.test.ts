import { describe, expect, it } from "vitest";
import { isConfiguratorPublicTenantRead } from "./configurator-public-tenant-read-auth-plugin.js";

describe("isConfiguratorPublicTenantRead", () => {
  it("allows GET tenant list, get-by-id, and tenant modules list", () => {
    expect(
      isConfiguratorPublicTenantRead("GET", "/api/configurator/v1/tenants?provisioning_status=active"),
    ).toBe(true);
    expect(
      isConfiguratorPublicTenantRead(
        "GET",
        "/api/configurator/v1/tenants/983934e8-f61c-4514-b8ec-df5ac7a6f02b",
      ),
    ).toBe(true);
    expect(
      isConfiguratorPublicTenantRead(
        "GET",
        "/api/configurator/v1/tenants/94478596-14d1-4e7e-b8d2-2995c61c3c90/modules",
      ),
    ).toBe(true);
  });

  it("rejects mutating methods and unrelated paths", () => {
    expect(isConfiguratorPublicTenantRead("POST", "/api/configurator/v1/tenants")).toBe(false);
    expect(isConfiguratorPublicTenantRead("PATCH", "/api/configurator/v1/tenants/abc")).toBe(
      false,
    );
    expect(
      isConfiguratorPublicTenantRead(
        "POST",
        "/api/configurator/v1/tenants/983934e8-f61c-4514-b8ec-df5ac7a6f02b/modules",
      ),
    ).toBe(false);
    expect(
      isConfiguratorPublicTenantRead(
        "GET",
        "/api/configurator/v1/tenants/983934e8-f61c-4514-b8ec-df5ac7a6f02b/modules/mod-1",
      ),
    ).toBe(false);
    expect(isConfiguratorPublicTenantRead("GET", "/api/configurator/v1/organizations")).toBe(false);
  });
});
