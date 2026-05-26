import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo, BundleManifestRepo, BundleStorageRepo } from "../ports.js";
import type { CareContext } from "../domain/care-context.js";
import type { BundleManifest } from "../domain/bundle-manifest.js";
import { evaluateDisclosure } from "./evaluate-disclosure.js";

describe("evaluateDisclosure", () => {
  const baseCtx: CareContext = {
    id: "ctx-1",
    iq_tenant_id: "tenant-1",
    patient_id: "patient-1",
    abha_linkage_status: "linked",
    abdm_reference_number: "REF-1",
    source_origin: "platform_module",
    source_system_id: "opd",
    source_record_type: "opd_visit",
    source_record_id: null,
    encounter_id: null,
    display: "Visit",
    period_start: new Date("2026-03-12T10:00:00Z"),
    period_end: null,
    status: "final",
    supersedes_id: null,
    sensitivity_labels: null,
    consent_disclosable: true,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: null,
    updated_by: null,
    linked_at: new Date(),
    data_erase_at: null,
  };

  it("returns matching bundles for disclosable care contexts", async () => {
    const careContextRepo = {
      findAll: vi.fn().mockResolvedValue({ data: [baseCtx], total: 1 }),
    } as unknown as CareContextRepo;

    const manifest: BundleManifest = {
      id: "manifest-1",
      iq_tenant_id: "tenant-1",
      care_context_id: "ctx-1",
      bundle_kind: "OpConsultRecord",
      fhir_profile_url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      fhir_profile_version: "2.0.0",
      producer_kind: "platform_module",
      producer_id: "opd",
      validation_status: "valid",
      validation_errors: null,
      bundle_storage_id: "storage-1",
      bundle_size_bytes: 100,
      bundle_hash: "hash-1",
      signature_storage_ref: null,
      produced_at: new Date(),
      received_at: null,
      stored_at: new Date(),
    };

    const bundleManifestRepo = {
      findByCareContext: vi.fn().mockResolvedValue([manifest]),
    } as unknown as BundleManifestRepo;

    const bundleStorageRepo = {
      findById: vi.fn().mockResolvedValue({ bundleJson: { resourceType: "Bundle" } }),
    } as unknown as BundleStorageRepo;

    const result = await evaluateDisclosure(
      { careContextRepo, bundleManifestRepo, bundleStorageRepo },
      "tenant-1",
      {
        consent_artifact_id: "consent-1",
        patient_id: "patient-1",
        hi_types: ["OPCONSULTATION"],
        date_range: { from: "2026-01-01T00:00:00Z", to: "2026-12-31T00:00:00Z" },
      },
    );

    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0]).toMatchObject({
      careContextReference: "manifest-1",
      content: { resourceType: "Bundle" },
    });
  });

  it("excludes non-disclosable care contexts", async () => {
    const nonDisclosable = { ...baseCtx, consent_disclosable: false };

    const careContextRepo = {
      findAll: vi.fn().mockResolvedValue({ data: [nonDisclosable], total: 1 }),
    } as unknown as CareContextRepo;

    const bundleManifestRepo = {
      findByCareContext: vi.fn(),
    } as unknown as BundleManifestRepo;

    const bundleStorageRepo = {} as unknown as BundleStorageRepo;

    const result = await evaluateDisclosure(
      { careContextRepo, bundleManifestRepo, bundleStorageRepo },
      "tenant-1",
      {
        consent_artifact_id: "consent-1",
        patient_id: "patient-1",
        hi_types: ["OPCONSULTATION"],
        date_range: { from: "2026-01-01T00:00:00Z", to: "2026-12-31T00:00:00Z" },
      },
    );

    expect(result.bundles).toHaveLength(0);
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].reason).toBe("not_disclosable");
  });
});
