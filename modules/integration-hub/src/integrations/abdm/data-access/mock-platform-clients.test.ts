import { describe, expect, it } from "vitest";
import { MockRecordFoundationClient } from "./mock-platform-clients.js";

describe("MockRecordFoundationClient", () => {
  it("returns PHR-renderable HealthDocumentRecord bundles per care context", async () => {
    const rf = new MockRecordFoundationClient();
    const tenantId = "00000000-0000-4000-8000-0000000000aa";
    const patientId = "00000000-0000-4000-8000-000000000001";
    rf.seedCareContexts({
      iqTenantId: tenantId,
      patientId,
      contexts: [
        { referenceNumber: "VISIT-MOCK-001", display: "OP consultation (mock)", hiType: "OPCONSULTATION" },
        { referenceNumber: "VISIT-MOCK-002", display: "Lab report (mock)", hiType: "OPCONSULTATION" },
      ],
    });
    const contexts = await rf.listCareContexts({ iqTenantId: tenantId, patientId });
    expect(contexts).toHaveLength(2);

    const bundles = await rf.listBundles({
      iqTenantId: tenantId,
      careContextId: "VISIT-MOCK-001",
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]!.careContextReference).toBe("VISIT-MOCK-001");
  });

  it("listBundles returns mock bundle for any consent ref (PHR ABDM-7727)", async () => {
    const rf = new MockRecordFoundationClient();
    const bundles = await rf.listBundles({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      careContextId: "VISIT-2026-010",
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]!.careContextReference).toBe("VISIT-2026-010");
    const bundle = JSON.parse(bundles[0]!.contentJson) as {
      resourceType: string;
      type: string;
      entry: { resource: { resourceType: string } }[];
    };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("document");
    const types = bundle.entry.map((e) => e.resource.resourceType);
    expect(types).toContain("Composition");
    expect(types).toContain("Patient");
    expect(types).toContain("DocumentReference");
    expect(bundles[0]!.media).toBe("application/fhir+json");
  });

  it("embeds configured ABHA address in Patient.identifier", async () => {
    const rf = new MockRecordFoundationClient("kamalthefirst@sbx");
    const [entry] = await rf.listBundles({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      careContextId: "VISIT-2026-001",
    });
    const bundle = JSON.parse(entry!.contentJson) as {
      entry: { resource: { resourceType: string; identifier?: { value: string }[] } }[];
    };
    const patient = bundle.entry.find((e) => e.resource.resourceType === "Patient");
    expect(patient?.resource.identifier?.[0]?.value).toBe("kamalthefirst@sbx");
  });
});
