import { afterEach, describe, expect, it, vi } from "vitest";
import { EmpiClientError } from "../../lib/empi-client-error.js";
import { runInboundCallback } from "./m2-inbound-helper.js";

vi.mock("../../../../lib/build-abdm-deps.js", () => ({
  buildAbdmDepsForTenant: vi.fn(),
}));

describe("runInboundCallback", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("releases idempotency row when handler fails so gateway can retry", async () => {
    process.env["NODE_ENV"] = "development";
    process.env["ABDM_DEV_TENANT_ID"] = "00000000-0000-4000-8000-0000000000aa";

    const release = vi.fn(async () => undefined);
    const { buildAbdmDepsForTenant } = await import("../../../../lib/build-abdm-deps.js");
    vi.mocked(buildAbdmDepsForTenant).mockResolvedValue({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      profile: {} as never,
      deps: {
        inboundMessages: {
          insertIfNew: async () => true,
          release,
        },
      } as never,
    });

    const reply = {
      code(status: number) {
        (this as { statusCode: number }).statusCode = status;
        return this;
      },
      statusCode: 0,
      send: vi.fn(async () => undefined),
    };

    await runInboundCallback({
      req: {
        headers: { "REQUEST-ID": "req-retry-1" },
        body: {},
      } as never,
      reply: reply as never,
      flowKind: "abdm.m2.user-initiated-link.v1",
      httpStatus: 202,
      sharedInfra: {
        profiles: {
          findActiveByTenantId: vi.fn(),
          findActiveByHipId: vi.fn(),
          findAllActiveAbdm: vi.fn(),
        },
      } as never,
      handler: async () => {
        throw new EmpiClientError("EMPI unavailable", 503);
      },
    });

    expect(release).toHaveBeenCalledWith({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      requestId: "req-retry-1",
    });
    expect(reply.statusCode).toBe(502);
  });
});
