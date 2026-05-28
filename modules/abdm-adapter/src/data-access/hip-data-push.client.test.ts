import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpHipDataPushClient } from "./hip-data-push.client.js";

describe("HttpHipDataPushClient loopback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends x-tenant-id on loopback push when iqTenantId is set", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpHipDataPushClient({
      loopbackHiu: true,
      adapterBaseUrl: "http://localhost:3007",
    });
    await client.push({
      dataPushUrl: "http://evil.example.com/api/v3/hiu/health-information/transfer/abc",
      body: { pageNumber: 0 },
      requestId: "req-1",
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-tenant-id"]).toBe(
      "00000000-0000-4000-8000-0000000000aa",
    );
    expect(String(init.headers?.["REQUEST-ID"] ?? "")).toBe("req-1");
  });

  it("omits REQUEST-ID on PHR apissbx transfer (legacy axios parity)", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpHipDataPushClient({ loopbackHiu: false });
    await client.push({
      dataPushUrl:
        "https://apissbx.abdm.gov.in/abha/api/v3/patient-hiu/app/v0.5/health-information/transfer",
      body: { pageNumber: 0 },
      requestId: "req-phr",
    });

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.headers?.["REQUEST-ID"]).toBeUndefined();
  });
});

describe("HttpHipDataPushClient allowlist", () => {
  it("rejects hosts not in allowlist", async () => {
    const client = new HttpHipDataPushClient({
      allowlistHosts: ["allowed.example.com"],
      loopbackHiu: false,
    });
    await expect(
      client.push({
        dataPushUrl: "https://evil.example.com/push",
        body: {},
        requestId: "req-1",
      }),
    ).rejects.toThrow(/allowlist/);
  });

});
