import { describe, expect, it, vi } from "vitest";
import type { BundleRepo, BundleRow } from "../../../src/ports.js";
import { storeBundle, BundleTooLargeError } from "../../../src/use-cases/store-bundle.js";

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

  it("throws when bundle_json exceeds size limit", async () => {
    const bundleRepo = {
      insert: vi.fn(),
    } as unknown as BundleRepo;

    const largePayload = { data: "x".repeat(60 * 1024 * 1024) };

    await expect(
      storeBundle(
        { bundleRepo },
        "tenant-1",
        {
          careContextId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          bundleKind: "OpConsultRecord",
          fhirProfileUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
          fhirProfileVersion: "2.0.0",
          producerKind: "platform_module",
          producerId: "opd",
          bundleJson: largePayload,
          producedAt: new Date(),
        },
      ),
    ).rejects.toThrow(BundleTooLargeError);

    expect(bundleRepo.insert).not.toHaveBeenCalled();
  });

  it("throws when care context does not exist (FK violation)", async () => {
    const fkError = new Error("insert or update on table \"bundles\" violates foreign key constraint \"fk_bundles_care_context\"");
    const bundleRepo = {
      insert: vi.fn().mockRejectedValue(fkError),
    } as unknown as BundleRepo;

    await expect(
      storeBundle(
        { bundleRepo },
        "tenant-1",
        {
          careContextId: "00000000-0000-4000-8000-000000000000",
          bundleKind: "OpConsultRecord",
          fhirProfileUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
          fhirProfileVersion: "2.0.0",
          producerKind: "platform_module",
          producerId: "opd",
          bundleJson: { resourceType: "Bundle", type: "document" },
          producedAt: new Date(),
        },
      ),
    ).rejects.toThrow("foreign key constraint");
  });
});
