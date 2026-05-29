import type { BundleRepo, BundleRow } from "../ports.js";

interface Deps {
  bundleRepo: BundleRepo;
}

export interface StoreBundleInput {
  careContextId: string;
  bundleKind: string;
  fhirProfileUrl: string;
  fhirProfileVersion: string;
  producerKind: string;
  producerId: string;
  bundleJson: Record<string, unknown>;
  producedAt: Date;
}

export async function storeBundle(
  deps: Deps,
  tenantId: string,
  input: StoreBundleInput,
): Promise<BundleRow> {
  const serialized = JSON.stringify(input.bundleJson);
  const bundleSizeBytes = Buffer.byteLength(serialized, "utf-8");

  return deps.bundleRepo.insert({
    iqTenantId: tenantId,
    care_context_id: input.careContextId,
    bundle_kind: input.bundleKind,
    fhir_profile_url: input.fhirProfileUrl,
    fhir_profile_version: input.fhirProfileVersion,
    producer_kind: input.producerKind,
    producer_id: input.producerId,
    bundle_json: input.bundleJson,
    bundle_size_bytes: bundleSizeBytes,
    produced_at: input.producedAt,
  });
}
