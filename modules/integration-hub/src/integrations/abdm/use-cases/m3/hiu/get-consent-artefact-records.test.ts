import { describe, expect, it, vi } from "vitest";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import type { AbdmAdapterDeps, M3ConsentRequestRow } from "../../../ports.js";
import { getConsentArtefactRecords } from "./get-consent-artefact-records.js";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const TENANT_ID = "00000000-0000-4000-8000-0000000000aa";

function consentRow(overrides: Partial<M3ConsentRequestRow> = {}): M3ConsentRequestRow {
  return {
    iqTenantId: TENANT_ID,
    consentRequestId: "req-1",
    sessionId: SESSION_ID,
    patientAbhaAddress: "user@sbx",
    hipId: null,
    purposeCode: "CAREMGT",
    hiTypes: ["Prescription"],
    permissionDateFrom: new Date("2025-01-01"),
    permissionDateTo: new Date("2026-06-01"),
    dataEraseAt: new Date("2099-01-01"),
    state: M3Hiu.CONSENT_GRANTED,
    consentArtefactIds: ["art-1"],
    context: {},
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
    ...overrides,
  };
}

describe("getConsentArtefactRecords", () => {
  it("returns null when consent is not accessible", async () => {
    const deps = {
      m3ConsentRequests: {
        findBySessionId: vi.fn().mockResolvedValue(
          consentRow({ state: M3Hiu.AWAITING_PATIENT_APPROVAL }),
        ),
      },
    } as unknown as AbdmAdapterDeps;

    const result = await getConsentArtefactRecords(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID },
      deps,
    );
    expect(result).toBeNull();
  });
});
