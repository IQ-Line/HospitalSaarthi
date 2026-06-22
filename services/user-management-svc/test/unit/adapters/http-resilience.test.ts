import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyUpstreamFailure,
  fetchJsonWithResilience,
  isRetryableUpstreamFailure,
} from "../../../src/adapters/http-resilience.js";

describe("http-resilience", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies timeout failures as retryable", () => {
    const failure = classifyUpstreamFailure(
      "configurator",
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );
    expect(failure.kind).toBe("timeout");
    expect(isRetryableUpstreamFailure(failure)).toBe(true);
  });

  it("retries transient HTTP failures then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const body = await fetchJsonWithResilience<{ data: unknown[] }>({
      url: "http://localhost:3001/modules",
      timeoutMs: 1000,
      maxAttempts: 3,
      source: "configurator",
    });

    expect(body.data).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after retry exhaustion on persistent 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(
      fetchJsonWithResilience({
        url: "http://localhost:8010/modules",
        timeoutMs: 1000,
        maxAttempts: 2,
        source: "master_data",
      }),
    ).rejects.toMatchObject({ kind: "transient_http", status: 503 });
  });
});
