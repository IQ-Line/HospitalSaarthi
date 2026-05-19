import { describe, expect, it } from "vitest";
import { validateEnvelope } from "@hims/ts-sdk-events";
import { createSessionStateChangedEnvelope } from "./abdm-envelope.js";

describe("createSessionStateChangedEnvelope", () => {
  it("passes ts-sdk-events envelope validation", () => {
    const event = createSessionStateChangedEnvelope(
      "00000000-0000-4000-8000-000000000099",
      {
        sessionId: "00000000-0000-4000-8000-000000000001",
        flowKind: "abdm.m1.aadhaar-otp.v1",
        prevState: "INIT",
        newState: "AADHAAR_OTP_REQUESTED",
      },
    );
    expect(() => validateEnvelope(event)).not.toThrow();
    expect(event.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.event_contract_version).toBe("1.0.0");
  });
});
