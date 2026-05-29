import { afterEach, describe, expect, it, vi } from "vitest";
import { isM3MockGateway, skipM3OutboundGateway } from "./m3-runtime-env.js";

describe("skipM3OutboundGateway", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false in dev when only mock flag is unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "false");
    expect(isM3MockGateway()).toBe(false);
    expect(skipM3OutboundGateway()).toBe(false);
  });

  it("is true when ABDM_M3_MOCK_GATEWAY=true", () => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "true");
    expect(skipM3OutboundGateway()).toBe(true);
  });
});
