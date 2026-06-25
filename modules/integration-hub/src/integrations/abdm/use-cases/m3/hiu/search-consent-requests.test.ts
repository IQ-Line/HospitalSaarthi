import { describe, expect, it } from "vitest";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import type { M3ConsentRequestRow } from "../../../ports.js";
import { toDisplayStatus } from "./search-consent-requests.js";

function row(overrides: Partial<M3ConsentRequestRow>): M3ConsentRequestRow {
  return {
    iqTenantId: "t1",
    consentRequestId: "req-1",
    sessionId: "00000000-0000-4000-8000-000000000001",
    patientAbhaAddress: "user@sbx",
    hipId: null,
    purposeCode: "CAREMGT",
    hiTypes: ["Prescription"],
    permissionDateFrom: new Date("2025-01-01"),
    permissionDateTo: new Date("2025-06-01"),
    dataEraseAt: new Date("2099-01-01"),
    state: M3Hiu.AWAITING_PATIENT_APPROVAL,
    consentArtefactIds: [],
    context: {},
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
    ...overrides,
  };
}

describe("toDisplayStatus", () => {
  it("maps awaiting approval to REQUESTED", () => {
    expect(toDisplayStatus(row({ state: M3Hiu.AWAITING_PATIENT_APPROVAL }))).toBe("REQUESTED");
  });

  it("maps granted flow states to GRANTED", () => {
    expect(toDisplayStatus(row({ state: M3Hiu.CONSENT_GRANTED }))).toBe("GRANTED");
  });

  it("maps revoked notify to REVOKED", () => {
    expect(
      toDisplayStatus(
        row({
          state: M3Hiu.CONSENT_DENIED,
          context: { error: { code: "REVOKED", message: "revoked" } },
        }),
      ),
    ).toBe("REVOKED");
  });

  it("treats past dataEraseAt as EXPIRED", () => {
    expect(
      toDisplayStatus(
        row({
          state: M3Hiu.CONSENT_GRANTED,
          dataEraseAt: new Date("2020-01-01"),
        }),
      ),
    ).toBe("EXPIRED");
  });
});
