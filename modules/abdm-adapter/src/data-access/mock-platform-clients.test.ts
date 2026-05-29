import { describe, expect, it } from "vitest";
import { MockRecordFoundationClient } from "./mock-platform-clients.js";

describe("MockRecordFoundationClient", () => {
  it("returns PHR-renderable HealthDocumentRecord bundles per care context", async () => {
    const rf = new MockRecordFoundationClient();
    const bundles = await rf.listBundles({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      careContextId: "visit-mock-001",
    });

    expect(bundles).toHaveLength(1);
    for (const entry of bundles) {
      const bundle = JSON.parse(entry.contentJson) as {
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
      expect(entry.media).toBe("application/fhir+json");
    }
  });

  it("returns all care contexts for listCareContexts", async () => {
    const rf = new MockRecordFoundationClient();
    const contexts = await rf.listCareContexts({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      patientId: "00000000-0000-4000-8000-000000000001",
    });

    expect(contexts).toHaveLength(2);
    expect(contexts[0]!.referenceNumber).toBe("VISIT-MOCK-001");
  });
});
