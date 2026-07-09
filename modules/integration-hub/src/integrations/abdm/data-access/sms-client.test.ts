import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSmsClientFromProfile,
  LoggingSmsClient,
  Msg91OtpSmsClient,
} from "./sms-client.js";
import type { TenantIntegrationProfile } from "../../../lib/integration-context.js";

function baseProfile(): TenantIntegrationProfile {
  return {
    id: "p1",
    iqTenantId: "00000000-0000-4000-8000-0000000000aa",
    integrationKind: "abdm",
    hipId: "HIP1",
    hiuId: "HIU1",
    cmId: "sbx",
    clientId: null,
    clientSecret: null,
    defaultSmsPhone: null,
    hipDisplayName: null,
    callbackBaseUrl: null,
    smsProvider: "logging",
    smsConfig: {},
    gatewayEnvironment: "sandbox",
  };
}

describe("createSmsClientFromProfile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses MSG91 from env when DB profile is still logging", () => {
    vi.stubEnv("ABDM_SMS_PROVIDER", "msg91");
    vi.stubEnv("MSG91_URL", "https://control.msg91.com/api/v5");
    vi.stubEnv("MSG91_AUTH_KEY", "test-key");
    vi.stubEnv("MSG91_TEMPLATE_ID", "tpl-1");

    const client = createSmsClientFromProfile(baseProfile());
    expect(client).toBeInstanceOf(Msg91OtpSmsClient);
  });

  it("keeps LoggingSmsClient when env is also logging", () => {
    vi.stubEnv("ABDM_SMS_PROVIDER", "logging");
    const client = createSmsClientFromProfile(baseProfile());
    expect(client).toBeInstanceOf(LoggingSmsClient);
  });
});
