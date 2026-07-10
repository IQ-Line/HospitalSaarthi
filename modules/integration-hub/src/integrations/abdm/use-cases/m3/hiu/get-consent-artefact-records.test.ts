import { describe, expect, it, vi } from "vitest";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import type {
  AbdmAdapterDeps,
  M3ConsentArtefactHiuRow,
  M3ConsentRequestRow,
} from "../../../ports.js";
import { getConsentArtefactRecords } from "./get-consent-artefact-records.js";

// Keep the REAL consent-accessibility gate (denied / erased / awaiting → not accessible),
// but stub loadArtefactDataPushed so we can drive this use-case's OWN logic (consentId
// filter, hipName extraction, per-artefact assembly) directly.
vi.mock("./search-consent-requests.js", async (importActual) => {
  const actual = await importActual<typeof import("./search-consent-requests.js")>();
  return { ...actual, loadArtefactDataPushed: vi.fn().mockResolvedValue(undefined) };
});

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

function artefact(
  consentId: string,
  hipId: string,
  hipName?: string,
): M3ConsentArtefactHiuRow {
  return {
    iqTenantId: TENANT_ID,
    consentId,
    consentRequestId: "req-1",
    patientAbhaAddress: "user@sbx",
    hipId,
    status: "GRANTED",
    dataEraseAt: new Date("2099-01-01"),
    grantedAt: new Date("2025-01-01"),
    hiTypes: ["Prescription"],
    careContexts: [],
    artefactJson: hipName ? { consentDetail: { hip: { name: hipName } } } : {},
    signature: "sig",
    signatureValid: true,
    receivedAt: new Date("2025-01-01"),
  };
}

function makeDeps(row: M3ConsentRequestRow, artefacts: M3ConsentArtefactHiuRow[]): AbdmAdapterDeps {
  return {
    m3ConsentRequests: { findBySessionId: vi.fn().mockResolvedValue(row) },
    m3ConsentArtefactsHiu: { listForRequest: vi.fn().mockResolvedValue(artefacts) },
    m3DataTransfers: { findLatestByConsentId: vi.fn().mockResolvedValue(null) },
  } as unknown as AbdmAdapterDeps;
}

describe("getConsentArtefactRecords", () => {
  it("returns null when consent is not accessible", async () => {
    const deps = makeDeps(consentRow({ state: M3Hiu.AWAITING_PATIENT_APPROVAL }), []);
    const result = await getConsentArtefactRecords(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID },
      deps,
    );
    expect(result).toBeNull();
  });

  it("returns null when consent is granted but past dataEraseAt", async () => {
    const deps = makeDeps(
      consentRow({ state: M3Hiu.CONSENT_GRANTED, dataEraseAt: new Date("2020-01-01") }),
      [artefact("art-1", "hip-A")],
    );
    const result = await getConsentArtefactRecords(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID },
      deps,
    );
    expect(result).toBeNull();
  });

  it("builds a record per artefact and extracts hipName from artefactJson.consentDetail.hip.name", async () => {
    const deps = makeDeps(consentRow(), [
      artefact("art-1", "hip-A", "Apollo"),
      artefact("art-2", "hip-B"), // no hip.name → hipName omitted
    ]);

    const result = await getConsentArtefactRecords(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID },
      deps,
    );

    expect(result).toEqual({
      sessionId: SESSION_ID,
      artefacts: [
        { consentId: "art-1", hipId: "hip-A", hipName: "Apollo" },
        { consentId: "art-2", hipId: "hip-B" },
      ],
    });
  });

  it("filters to a single artefact when consentId is supplied", async () => {
    const deps = makeDeps(consentRow(), [
      artefact("art-1", "hip-A"),
      artefact("art-2", "hip-B"),
    ]);

    const result = await getConsentArtefactRecords(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, consentId: "art-2" },
      deps,
    );

    expect(result?.artefacts).toEqual([{ consentId: "art-2", hipId: "hip-B" }]);
  });

  it("returns null when a consentId is supplied but matches no artefact", async () => {
    const deps = makeDeps(consentRow(), [artefact("art-1", "hip-A")]);

    const result = await getConsentArtefactRecords(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, consentId: "does-not-exist" },
      deps,
    );

    expect(result).toBeNull();
  });
});
