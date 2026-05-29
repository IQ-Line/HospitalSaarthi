import { describe, expect, it, vi } from "vitest";
import type { BundleRepo, BundleRow } from "../ports.js";
import { storeBundle } from "./store-bundle.js";

describe("storeBundle", () => {
  it("stores a bundle and returns it with size", async () => {
    const bundle: BundleRow = {
      id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
      iq_tenant_id: "tenant-1",
      care_context_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      bundle_kind: "OpConsultRecord",
      fhir_profile_url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      fhir_profile_version: "2.0.0",
      producer_kind: "platform_module",
      producer_id: "opd",
      bundle_json: { resourceType: "Bundle", type: "document" },
      bundle_size_bytes: 123,
      produced_at: new Date(),
      stored_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    };

    const bundleRepo = {
      insert: vi.fn().mockResolvedValue(bundle),
    } as unknown as BundleRepo;

    const result = await storeBundle(
      { bundleRepo },
      "tenant-1",
      {
        careContextId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        bundleKind: "OpConsultRecord",
        fhirProfileUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
        fhirProfileVersion: "2.0.0",
        producerKind: "platform_module",
        producerId: "opd",
        bundleJson: { resourceType: "Bundle", type: "document" },
        producedAt: new Date(),
      },
    );

    expect(bundleRepo.insert).toHaveBeenCalledOnce();
    expect(result.id).toBe("bbbbbbbb-cccc-dddd-eeee-ffffffffffff");
    expect(result.bundle_size_bytes).toBeGreaterThan(0);
  });
});
