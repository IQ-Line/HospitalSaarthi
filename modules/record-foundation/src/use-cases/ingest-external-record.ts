import { createHash } from "node:crypto";
import type {
  CareContextRepo,
  BundleManifestRepo,
  BundleStorageRepo,
  ExternalHealthRecordRepo,
} from "../ports.js";
import type { ExternalHealthRecord } from "../domain/external-record.js";

interface Deps {
  careContextRepo: CareContextRepo;
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
  externalHealthRecordRepo: ExternalHealthRecordRepo;
}

export interface IngestExternalRecordInput {
  iqTenantId: string;
  patientId: string;
  consentArtifactId: string;
  bundleJson: Record<string, unknown>;
  sourceHipId: string;
  sourceHipDisplayName?: string;
  dataEraseAt: Date;
  bundleKind: string;
  fhirProfileUrl: string;
  fhirProfileVersion: string;
  producedAt: Date;
}

export async function ingestExternalRecord(
  deps: Deps,
  input: IngestExternalRecordInput,
): Promise<{ externalRecord: ExternalHealthRecord; careContextId: string }> {
  const serialized = JSON.stringify(input.bundleJson);
  const bundleHash = createHash("sha256").update(serialized).digest("hex");
  const bundleSizeBytes = Buffer.byteLength(serialized, "utf-8");

  const { id: bundleStorageId } = await deps.bundleStorageRepo.insert({
    iqTenantId: input.iqTenantId,
    bundleJson: input.bundleJson,
  });

  const careContext = await deps.careContextRepo.create({
    iq_tenant_id: input.iqTenantId,
    patient_id: input.patientId,
    source_origin: "external_abdm",
    source_system_id: input.sourceHipId,
    source_record_type: "external_record",
    display: `External record from ${input.sourceHipDisplayName ?? input.sourceHipId}`,
    period_start: new Date(),
    data_erase_at: input.dataEraseAt,
  });

  const manifest = await deps.bundleManifestRepo.create({
    iq_tenant_id: input.iqTenantId,
    care_context_id: careContext.id,
    bundle_kind: input.bundleKind as never,
    fhir_profile_url: input.fhirProfileUrl,
    fhir_profile_version: input.fhirProfileVersion,
    producer_kind: "external_hip",
    producer_id: input.sourceHipId,
    bundle_storage_id: bundleStorageId,
    bundle_size_bytes: bundleSizeBytes,
    bundle_hash: bundleHash,
    produced_at: input.producedAt,
    received_at: new Date(),
  });

  const externalRecord = await deps.externalHealthRecordRepo.create({
    iq_tenant_id: input.iqTenantId,
    patient_id: input.patientId,
    care_context_id: careContext.id,
    bundle_manifest_id: manifest.id,
    consent_artifact_id: input.consentArtifactId,
    source_hip_id: input.sourceHipId,
    source_hip_display_name: input.sourceHipDisplayName,
    data_erase_at: input.dataEraseAt,
  });

  return { externalRecord, careContextId: careContext.id };
}
