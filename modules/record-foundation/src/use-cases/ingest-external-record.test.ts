import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo, BundleManifestRepo, BundleStorageRepo, ExternalHealthRecordRepo } from "../ports.js";
import type { ExternalHealthRecord } from "../domain/external-record.js";
import type { CareContext } from "../domain/care-context.js";
import type { BundleManifest } from "../domain/bundle-manifest.js";
import { ingestExternalRecord } from "./ingest-external-record.js";

describe("ingestExternalRecord", () => {
  it("ingests an external record with care context and bundle", async () => {
    const careContext: CareContext = {
      id: "cc-1",
      iq_tenant_id: "tenant-1",
      patient_id: "patient-1",
      abha_linkage_status: "not_linked",
      abdm_reference_number: null,
      source_origin: "external_abdm",
      source_system_id: "hip-1",
      source_record_type: "external_record",
      source_record_id: null,
      encounter_id: null,
      display: "External record from hip-1",
      period_start: new Date(),
      period_end: null,
      status: "draft",
      supersedes_id: null,
      sensitivity_labels: null,
      consent_disclosable: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
      linked_at: null,
      data_erase_at: new Date("2027-01-01T00:00:00Z"),
    };

    const manifest: BundleManifest = {
      id: "manifest-1",
      iq_tenant_id: "tenant-1",
      care_context_id: "cc-1",
      bundle_kind: "HealthDocumentRecord",
      fhir_profile_url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord",
      fhir_profile_version: "2.0.0",
      producer_kind: "external_hip",
      producer_id: "hip-1",
      validation_status: "pending",
      validation_errors: null,
      bundle_storage_id: "storage-1",
      bundle_size_bytes: 50,
      bundle_hash: "hash-1",
      signature_storage_ref: null,
      produced_at: new Date(),
      received_at: new Date(),
      stored_at: new Date(),
    };

    const externalRecord: ExternalHealthRecord = {
      id: "er-1",
      iq_tenant_id: "tenant-1",
      patient_id: "patient-1",
      care_context_id: "cc-1",
      bundle_manifest_id: "manifest-1",
      consent_artifact_id: "consent-1",
      source_hip_id: "hip-1",
      source_hip_display_name: "Test HIP",
      received_at: new Date(),
      display_summary: null,
      doctor_viewed_at: null,
      data_erase_at: new Date("2027-01-01T00:00:00Z"),
    };

    const bundleStorageRepo = {
      insert: vi.fn().mockResolvedValue({ id: "storage-1" }),
    } as unknown as BundleStorageRepo;

    const careContextRepo = {
      create: vi.fn().mockResolvedValue(careContext),
    } as unknown as CareContextRepo;

    const bundleManifestRepo = {
      create: vi.fn().mockResolvedValue(manifest),
    } as unknown as BundleManifestRepo;

    const externalHealthRecordRepo = {
      create: vi.fn().mockResolvedValue(externalRecord),
    } as unknown as ExternalHealthRecordRepo;

    const result = await ingestExternalRecord(
      {
        careContextRepo,
        bundleManifestRepo,
        bundleStorageRepo,
        externalHealthRecordRepo,
      },
      {
        iqTenantId: "tenant-1",
        patientId: "patient-1",
        consentArtifactId: "consent-1",
        bundleJson: { resourceType: "Bundle" },
        sourceHipId: "hip-1",
        sourceHipDisplayName: "Test HIP",
        dataEraseAt: new Date("2027-01-01T00:00:00Z"),
        bundleKind: "HealthDocumentRecord",
        fhirProfileUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord",
        fhirProfileVersion: "2.0.0",
        producedAt: new Date(),
      },
    );

    expect(bundleStorageRepo.insert).toHaveBeenCalledOnce();
    expect(careContextRepo.create).toHaveBeenCalledOnce();
    expect(bundleManifestRepo.create).toHaveBeenCalledOnce();
    expect(externalHealthRecordRepo.create).toHaveBeenCalledOnce();
    expect(result.externalRecord.id).toBe("er-1");
    expect(result.careContextId).toBe("cc-1");
  });
});
