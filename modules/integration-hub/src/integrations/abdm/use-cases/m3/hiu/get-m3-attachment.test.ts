import { beforeEach, describe, expect, it, vi } from "vitest";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import type {
  AbdmAdapterDeps,
  M3ConsentArtefactHiuRow,
  M3ConsentRequestRow,
} from "../../../ports.js";
import { extractAttachmentContent } from "../../../lib/fhir-bundle-display.js";
import { getM3Attachment } from "./get-m3-attachment.js";
import { loadArtefactDataPushed } from "./search-consent-requests.js";

// Keep the REAL consent-accessibility gate (denied / erased / awaiting → not accessible,
// exercised by the null-guard tests below), but stub the two collaborators the value path
// delegates to so we can drive the entry-match + extraction logic directly.
vi.mock("./search-consent-requests.js", async (importActual) => {
  const actual = await importActual<typeof import("./search-consent-requests.js")>();
  return { ...actual, loadArtefactDataPushed: vi.fn() };
});
vi.mock("../../../lib/fhir-bundle-display.js", () => ({
  extractAttachmentContent: vi.fn(),
}));

const mockLoad = vi.mocked(loadArtefactDataPushed);
const mockExtract = vi.mocked(extractAttachmentContent);

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

// Deps with one granted artefact whose data-pushed entries the value path will scan.
function depsWithEntries(
  entries: Array<{ content?: string; careContextReference?: string }>,
): AbdmAdapterDeps {
  const artefact = { consentId: "art-1", hipId: "hip-A" } as unknown as M3ConsentArtefactHiuRow;
  mockLoad.mockResolvedValue({ entries } as never);
  return {
    m3ConsentRequests: { findBySessionId: vi.fn().mockResolvedValue(consentRow()) },
    m3ConsentArtefactsHiu: { listForRequest: vi.fn().mockResolvedValue([artefact]) },
    m3DataTransfers: { findLatestByConsentId: vi.fn().mockResolvedValue(null) },
  } as unknown as AbdmAdapterDeps;
}

beforeEach(() => {
  vi.clearAllMocks();
});

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
      minimalDeps(consentRow({ state: M3Hiu.CONSENT_GRANTED, dataEraseAt: new Date("2020-01-01") })),
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

  it("returns the extracted attachment when an entry's FHIR bundle id matches", async () => {
    const deps = depsWithEntries([
      { content: JSON.stringify({ id: "other" }), careContextReference: "cc-0" },
      { content: JSON.stringify({ id: "bundle-1" }), careContextReference: "cc-1" },
    ]);
    mockExtract.mockReturnValue({
      title: "Prescription",
      contentType: "application/pdf",
      content: "BASE64",
    });

    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "bundle-1", num: 2 },
      deps,
    );

    expect(result).toEqual({
      attachment: { title: "Prescription", contentType: "application/pdf", content: "BASE64" },
    });
    // The MATCHING entry's content (not the first entry) was handed to the extractor, at `num`.
    expect(mockExtract).toHaveBeenCalledWith(JSON.stringify({ id: "bundle-1" }), 2);
  });

  it("matches on careContextReference when the entry content is not valid JSON", async () => {
    const deps = depsWithEntries([{ content: "<<not json>>", careContextReference: "cc-9" }]);
    mockExtract.mockReturnValue({ title: "T", contentType: "text/plain", content: "X" });

    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "cc-9", num: 1 },
      deps,
    );

    expect(result?.attachment.content).toBe("X");
  });

  it("returns null when a bundle matches but the attachment cannot be extracted", async () => {
    const deps = depsWithEntries([{ content: JSON.stringify({ id: "bundle-1" }), careContextReference: "cc-1" }]);
    mockExtract.mockReturnValue(null);

    const result = await getM3Attachment(
      { iqTenantId: TENANT_ID, sessionId: SESSION_ID, bundleId: "bundle-1", num: 1 },
      deps,
    );

    expect(result).toBeNull();
  });
});
