import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpRecordFoundationClient } from "./record-foundation-client.http.js";

describe("HttpRecordFoundationClient.fetchBundlesForConsent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes care_context_reference query params to Record Foundation", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        entries: [
          {
            careContextReference: "VISIT-2026-001",
            content: "{}",
            media: "application/fhir+json",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rf = new HttpRecordFoundationClient("https://rf.example");
    const bundles = await rf.fetchBundlesForConsent({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      patientId: "00000000-0000-4000-8000-000000000001",
      consentId: "consent-1",
      careContextReferences: ["VISIT-2026-001", "VISIT-2026-002"],
    });

    expect(bundles).toHaveLength(1);
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain("care_context_reference=VISIT-2026-001");
    expect(calledUrl).toContain("care_context_reference=VISIT-2026-002");
  });
});
