import type {
  ExternalHealthRecordRepo,
  BundleManifestRepo,
  BundleStorageRepo,
} from "../ports.js";
import type { ExternalHealthRecord } from "../domain/external-record.js";

interface Deps {
  externalHealthRecordRepo: ExternalHealthRecordRepo;
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
}

export interface ExternalRecordWithBundle {
  record: ExternalHealthRecord;
  bundle: Record<string, unknown>;
}

export async function getExternalRecord(
  deps: Deps,
  tenantId: string,
  id: string,
): Promise<ExternalRecordWithBundle | null> {
  const record = await deps.externalHealthRecordRepo.findById(tenantId, id);
  if (!record) return null;

  const manifest = await deps.bundleManifestRepo.findById(
    tenantId,
    record.bundle_manifest_id,
  );
  if (!manifest) return { record, bundle: {} };

  const storage = await deps.bundleStorageRepo.findById(
    tenantId,
    manifest.bundle_storage_id,
  );

  return {
    record,
    bundle: storage?.bundleJson ?? {},
  };
}
