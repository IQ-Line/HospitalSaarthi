import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpConfiguratorTenantModuleEntitlementAdapter } from "../../../src/adapters/http-configurator-tenant-module-entitlement-adapter.js";

describe("HttpConfiguratorTenantModuleEntitlementAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns tenant-enabled module ids from Configurator", async () => {
    const tenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d480";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { iq_tenant_id: tenantId, module_id: "mod-a", is_active: true },
            { iq_tenant_id: tenantId, module_id: "mod-b", is_active: true },
          ],
          total: 2,
        }),
      }),
    );

    const adapter = new HttpConfiguratorTenantModuleEntitlementAdapter({
      baseUrl: "http://localhost:3001",
    });

    const moduleIds = await adapter.listTenantEnabledModuleIds(tenantId, {
      authorization: "Bearer token",
    });

    expect(moduleIds).toEqual(["mod-a", "mod-b"]);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/configurator/v1/tenants/${tenantId}/modules?is_active=true`,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer token",
          "x-tenant-id": tenantId,
        }),
      }),
    );
  });

  it("retries on transient 503 then succeeds", async () => {
    const tenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d480";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ module_id: "mod-a", is_active: true }],
          }),
        }),
    );

    const adapter = new HttpConfiguratorTenantModuleEntitlementAdapter({
      baseUrl: "http://localhost:3001",
      maxAttempts: 2,
    });

    await expect(adapter.listTenantEnabledModuleIds(tenantId)).resolves.toEqual(["mod-a"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws MODULE_ENTITLEMENT_LOOKUP_FAILED when Configurator returns non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const adapter = new HttpConfiguratorTenantModuleEntitlementAdapter({
      baseUrl: "http://localhost:3001",
    });

    await expect(
      adapter.listTenantEnabledModuleIds("f47ac10b-58cc-4372-a567-0e02b2c3d480"),
    ).rejects.toMatchObject({
      code: "MODULE_ENTITLEMENT_LOOKUP_FAILED",
      source: "configurator",
    });
  });
});
