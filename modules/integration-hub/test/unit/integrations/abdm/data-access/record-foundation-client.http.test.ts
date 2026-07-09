import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpRecordFoundationClient } from "../../../../../src/integrations/abdm/data-access/record-foundation-client.http.js";

describe("HttpRecordFoundationClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listCareContexts maps source_record_id to referenceNumber", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            source_record_id: "VISIT-2026-001_OPConsultNote",
            source_record_type: "opd_visit",
            display: "OP consultation",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rf = new HttpRecordFoundationClient("https://rf.example");
    const contexts = await rf.listCareContexts({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      patientId: "00000000-0000-4000-8000-000000000001",
    });

    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.referenceNumber).toBe("VISIT-2026-001_OPConsultNote");
    expect(contexts[0]!.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("listBundles calls care-context bundles endpoint with encoded ref", async () => {
    const fetchMock = vi.fn(async (..._args: Parameters<typeof fetch>) =>
      Response.json({
        data: [
          {
            id: "bundle-1",
            care_context_id: "11111111-1111-4111-8111-111111111111",
            bundle_json: { resourceType: "Bundle", type: "document" },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rf = new HttpRecordFoundationClient("https://rf.example");
    const bundles = await rf.listBundles({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      careContextId: "VISIT-2026-001_OPConsultNote",
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]!.careContextReference).toBe("VISIT-2026-001_OPConsultNote");
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain(
      "/api/record-foundation/v1/care-contexts/VISIT-2026-001_OPConsultNote/bundles",
    );
  });
});
