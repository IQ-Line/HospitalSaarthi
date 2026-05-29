import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpRecordFoundationClient } from "./record-foundation-client.http.js";

describe("HttpRecordFoundationClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listCareContexts passes patient_id query param to Record Foundation", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            id: "cc-1",
            patient_id: "patient-1",
            display: "OP Visit",
            source_record_type: "OPCONSULTATION",
          },
        ],
        total: 1,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rf = new HttpRecordFoundationClient("https://rf.example");
    const contexts = await rf.listCareContexts({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      patientId: "patient-1",
    });

    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.id).toBe("cc-1");
    expect(contexts[0]!.referenceNumber).toBe("cc-1");
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain("patient_id=patient-1");
  });

  it("listBundles passes careContextId in URL path", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            id: "bundle-1",
            care_context_id: "cc-1",
            bundle_json: { resourceType: "Bundle", type: "document" },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rf = new HttpRecordFoundationClient("https://rf.example");
    const bundles = await rf.listBundles({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      careContextId: "cc-1",
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]!.careContextReference).toBe("cc-1");
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain("/care-contexts/cc-1/bundles");
  });
});
