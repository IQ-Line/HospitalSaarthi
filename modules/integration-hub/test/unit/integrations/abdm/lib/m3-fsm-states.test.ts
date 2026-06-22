import { describe, expect, it } from "vitest";
import { M3Hiu, M3Hip } from "../../../../../src/integrations/abdm/lib/m3-fsm-states.js";
import { M3_HIU_STATES, M3_HIP_STATES } from "@hims/ts-sdk-abha";

describe("m3-fsm-states", () => {
  it("M3Hiu aliases match canonical M3_HIU_STATES indices", () => {
    expect(M3Hiu.CONSENT_INIT_REQUESTED).toBe(M3_HIU_STATES[0]);
    expect(M3Hiu.ACKNOWLEDGED).toBe(M3_HIU_STATES[10]);
  });

  it("M3Hip aliases match canonical M3_HIP_STATES indices", () => {
    expect(M3Hip.DATA_REQUESTED).toBe(M3_HIP_STATES[4]);
    expect(M3Hip.FAILED).toBe(M3_HIP_STATES[10]);
  });
});
