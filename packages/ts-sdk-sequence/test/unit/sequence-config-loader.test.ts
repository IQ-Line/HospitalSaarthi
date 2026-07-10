import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpSequenceConfigLoader } from "../../src/sequence-config-loader.js";

// ---------------------------------------------------------------------------
// The HTTP sequence-config loader replaced the SDK's cross-schema SQL JOIN into
// configurator.* . These tests pin the behaviour the allocation path depends on:
//   - a good response is normalised and CACHED within the TTL (one fetch),
//   - any failure DEGRADES to platform defaults and is NOT cached (so a
//     transient outage never sticks — the next call retries),
//   - the env fallback numeric code (default "00001") is preserved exactly.
// global.fetch is stubbed; no network.
// ---------------------------------------------------------------------------

const TENANT = "a0000000-0000-4000-8000-00000000000a";
const BASE = "https://configurator:3001";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createHttpSequenceConfigLoader", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalises a good response and hits the internal sequence-config route with the key header", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        tenant_numeric_code: "42",
        identifier_overrides: { op_bill: { is_custom: true } },
      }),
    );
    const load = createHttpSequenceConfigLoader({
      configuratorBaseUrl: `${BASE}/`, // trailing slash must be stripped
      internalApiKey: "secret",
    });

    const cfg = await load(TENANT);

    expect(cfg.tenantNumericCode).toBe("00042"); // normalised to 5 digits
    expect(cfg.identifierOverrides).toEqual({ op_bill: { is_custom: true } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${BASE}/api/configurator/v1/internal/tenants/${TENANT}/sequence-config`,
    );
    expect((init.headers as Record<string, string>)["x-configurator-internal-key"]).toBe("secret");
  });

  it("caches within the TTL — a second call does not refetch", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tenant_numeric_code: "7" }));
    const load = createHttpSequenceConfigLoader({ configuratorBaseUrl: BASE, ttlMs: 60_000 });

    const a = await load(TENANT);
    const b = await load(TENANT);

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("omits the key header when no internalApiKey is configured (local dev)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tenant_numeric_code: "1" }));
    const load = createHttpSequenceConfigLoader({ configuratorBaseUrl: BASE });

    await load(TENANT);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-configurator-internal-key"]).toBeUndefined();
  });

  it("degrades to the default fallback (00001) on a fetch failure and does NOT cache it", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const warn = vi.fn();
    const load = createHttpSequenceConfigLoader({ configuratorBaseUrl: BASE, warn });

    const degraded = await load(TENANT);
    expect(degraded).toEqual({ tenantNumericCode: "00001", identifierOverrides: {} });
    expect(warn).toHaveBeenCalledOnce();

    // Not cached: the next call retries. A good response now wins.
    fetchMock.mockResolvedValueOnce(jsonResponse({ tenant_numeric_code: "9" }));
    const recovered = await load(TENANT);
    expect(recovered.tenantNumericCode).toBe("00009");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("degrades on a non-2xx status, honouring a custom fallback code", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "boom" }, 503));
    const load = createHttpSequenceConfigLoader({
      configuratorBaseUrl: BASE,
      fallbackTenantNumericCode: "00007",
    });

    const cfg = await load(TENANT);
    expect(cfg).toEqual({ tenantNumericCode: "00007", identifierOverrides: {} });
  });

  it("falls back on a missing/blank tenant_numeric_code but keeps a 200 response's overrides", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ tenant_numeric_code: "   ", identifier_overrides: {} }),
    );
    const load = createHttpSequenceConfigLoader({ configuratorBaseUrl: BASE });

    const cfg = await load(TENANT);
    expect(cfg.tenantNumericCode).toBe("00001");
  });

  it("degrades when the body is not valid JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>nope</html>", { status: 200, headers: { "content-type": "text/html" } }),
    );
    const load = createHttpSequenceConfigLoader({ configuratorBaseUrl: BASE });

    const cfg = await load(TENANT);
    expect(cfg).toEqual({ tenantNumericCode: "00001", identifierOverrides: {} });
  });
});
