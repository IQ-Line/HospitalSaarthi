import { describe, expect, it } from "vitest";
import { getAbdmDeps } from "./get-abdm-deps.js";
import { IntegrationContextMissingError } from "./integration-hub-errors.js";

describe("getAbdmDeps", () => {
  it("returns deps from request.integrationCtx", () => {
    const deps = { xHipId: "HIP-TEST" } as never;
    const request = {
      integrationCtx: { iqTenantId: "t1", profile: {} as never, deps },
    } as never;

    expect(getAbdmDeps(request).xHipId).toBe("HIP-TEST");
  });

  it("throws IntegrationContextMissingError when context absent", () => {
    expect(() => getAbdmDeps({} as never)).toThrow(IntegrationContextMissingError);
  });
});
