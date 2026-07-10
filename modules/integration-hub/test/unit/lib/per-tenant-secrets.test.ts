import { describe, expect, it } from "vitest";
import {
  createSecretsClientFromProfile,
  PROFILE_CLIENT_ID_REF,
  PROFILE_CLIENT_SECRET_REF,
} from "../../../src/lib/per-tenant-secrets.js";

describe("createSecretsClientFromProfile", () => {
  it("resolves profile client credentials", async () => {
    const secrets = createSecretsClientFromProfile({
      id: "p1",
      iqTenantId: "tenant-1",
      integrationKind: "abdm",
      hipId: "HIP",
      hiuId: "HIU",
      cmId: "sbx",
      clientId: "client-a",
      clientSecret: "secret-b",
      defaultSmsPhone: null,
      hipDisplayName: null,
      callbackBaseUrl: null,
      smsProvider: null,
      smsConfig: {},
      gatewayEnvironment: "sandbox",
    });

    await expect(secrets.resolve(PROFILE_CLIENT_ID_REF)).resolves.toBe("client-a");
    await expect(secrets.resolve(PROFILE_CLIENT_SECRET_REF)).resolves.toBe("secret-b");
  });
});
