import { describe, expect, it, vi } from "vitest";
import type { BundleManifestRepo, BundleStorageRepo } from "../ports.js";
import type { BundleManifest } from "../domain/bundle-manifest.js";
import { storeBundle } from "./store-bundle.js";

describe("storeBundle", () => {
  it("stores a bundle and returns manifest with hash", async () => {
    const manifest: BundleManifest = {
      id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
      iq_tenant_id: "tenant-1",
      care_context_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      bundle_kind: "OpConsultRecord",
      fhir_profile_url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      fhir_profile_version: "2.0.0",
      producer_kind: "platform_module",
      producer_id: "opd",
      validation_status: "pending",
      validation_errors: null,
      bundle_storage_id: "storage-1",
      bundle_size_bytes: 123,
      bundle_hash: "abc123",
      signature_storage_ref: null,
      produced_at: new Date(),
      received_at: null,
      stored_at: new Date(),
    };

    const bundleStorageRepo = {
      insert: vi.fn().mockResolvedValue({ id: "storage-1" }),
    } as unknown as BundleStorageRepo;

    const bundleManifestRepo = {
      create: vi.fn().mockResolvedValue(manifest),
    } as unknown as BundleManifestRepo;

    const result = await storeBundle(
      { bundleManifestRepo, bundleStorageRepo },
      {
        iqTenantId: "tenant-1",
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

    expect(bundleStorageRepo.insert).toHaveBeenCalledOnce();
    expect(bundleManifestRepo.create).toHaveBeenCalledOnce();
    expect(result.bundleHash).toBeTruthy();
    expect(result.manifest.bundle_storage_id).toBe("storage-1");
  });
});
