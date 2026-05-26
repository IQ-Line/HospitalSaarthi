import { createHash } from "node:crypto";
import type {
  BundleManifestRepo,
  BundleStorageRepo,
} from "../ports.js";
import type { BundleManifest } from "../domain/bundle-manifest.js";

interface Deps {
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
}

export interface StoreBundleInput {
  iqTenantId: string;
  careContextId: string;
  bundleKind: string;
  fhirProfileUrl: string;
  fhirProfileVersion: string;
  producerKind: string;
  producerId: string;
  bundleJson: Record<string, unknown>;
  producedAt: Date;
  receivedAt?: Date;
}

export interface StoreBundleResult {
  manifest: BundleManifest;
  bundleStorageId: string;
  bundleHash: string;
}

export async function storeBundle(
  deps: Deps,
  input: StoreBundleInput,
): Promise<StoreBundleResult> {
  const serialized = JSON.stringify(input.bundleJson);
  const bundleHash = createHash("sha256").update(serialized).digest("hex");
  const bundleSizeBytes = Buffer.byteLength(serialized, "utf-8");

  const { id: bundleStorageId } = await deps.bundleStorageRepo.insert({
    iqTenantId: input.iqTenantId,
    bundleJson: input.bundleJson,
  });

  const manifest = await deps.bundleManifestRepo.create({
    iq_tenant_id: input.iqTenantId,
    care_context_id: input.careContextId,
    bundle_kind: input.bundleKind as never,
    fhir_profile_url: input.fhirProfileUrl,
    fhir_profile_version: input.fhirProfileVersion,
    producer_kind: input.producerKind as never,
    producer_id: input.producerId,
    bundle_storage_id: bundleStorageId,
    bundle_size_bytes: bundleSizeBytes,
    bundle_hash: bundleHash,
    produced_at: input.producedAt,
    received_at: input.receivedAt,
  });

  return { manifest, bundleStorageId, bundleHash };
}
