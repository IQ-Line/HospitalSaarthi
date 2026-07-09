import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { HttpGatewayClient } from "./gateway-client.http.js";
import { EnvSecretsClient } from "./env-secrets.client.js";

describe("HttpGatewayClient doGet", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv("ABDM_SANDBOX_CLIENT_ID", "test-client");
    vi.stubEnv("ABDM_SANDBOX_CLIENT_SECRET", "test-secret");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("sends X-CM-ID on gateway-target GET requests", async () => {
    let capturedHeaders: RequestInit["headers"];

    globalThis.fetch = vi.fn(async (_url, init) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({ accessToken: "token-1", expiresIn: 1200 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({ bridge: { id: "SBX" }, services: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const client = new HttpGatewayClient({
      gatewayBaseUrl: "https://dev.abdm.gov.in",
      abhaApiBaseUrl: "https://abhasbx.abdm.gov.in/abha/api",
      xCmId: "sbx",
      secrets: new EnvSecretsClient(),
    });

    await client.get({
      path: "/api/hiecm/gateway/v3/bridge-services",
      target: "gateway",
    });

    expect(capturedHeaders).toMatchObject({
      "X-CM-ID": "sbx",
      Authorization: "Bearer token-1",
    });
  });
});
