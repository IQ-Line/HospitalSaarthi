import { describe, expect, it, vi } from "vitest";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import type { AbdmAdapterDeps, M3ConsentRequestRow } from "../../../ports.js";
import { getM3Attachment } from "./get-m3-attachment.js";

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

function minimalDeps(row: M3ConsentRequestRow | null): AbdmAdapterDeps {
  return {
    m3ConsentRequests: {
      findBySessionId: vi.fn().mockResolvedValue(row),
    },
    m3ConsentArtefactsHiu: {
      listForRequest: vi.fn().mockResolvedValue([]),
    },
    m3DataTransfers: {
      findLatestByConsentId: vi.fn(),
    },
  } as unknown as AbdmAdapterDeps;
}

describe("getM3Attachment", () => {
  it("returns null when consent session is not found", async () => {
    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "bundle-1", num: 1 },
      minimalDeps(null),
    );
    expect(result).toBeNull();
  });

  it("returns null when consent is denied", async () => {
    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "bundle-1", num: 1 },
      minimalDeps(
        consentRow({
          state: M3Hiu.CONSENT_DENIED,
          context: { error: { code: "DENIED", message: "denied" } },
        }),
      ),
    );
    expect(result).toBeNull();
  });

  it("returns null when consent is past dataEraseAt", async () => {
    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "bundle-1", num: 1 },
      minimalDeps(
        consentRow({
          state: M3Hiu.CONSENT_GRANTED,
          dataEraseAt: new Date("2020-01-01"),
        }),
      ),
    );
    expect(result).toBeNull();
  });

  it("returns null when consent is still awaiting patient approval", async () => {
    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "bundle-1", num: 1 },
      minimalDeps(consentRow({ state: M3Hiu.AWAITING_PATIENT_APPROVAL })),
    );
    expect(result).toBeNull();
  });
});
