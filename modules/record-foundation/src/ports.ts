import type {
  CareContext,
  CreateCareContextData,
  CareContextFilters,
} from "./domain/care-context.js";
import type {
  BundleManifest,
  CreateBundleManifestData,
} from "./domain/bundle-manifest.js";
import type {
  ExternalHealthRecord,
  IngestExternalRecordData,
} from "./domain/external-record.js";

export interface CareContextRepo {
  findAll(
    tenantId: string,
    filters: CareContextFilters,
  ): Promise<{ data: CareContext[]; total: number }>;
  findById(tenantId: string, id: string): Promise<CareContext | null>;
  create(data: CreateCareContextData): Promise<CareContext>;
  updateLinkage(
    tenantId: string,
    id: string,
    abhaLinkageStatus: string,
    abdmReferenceNumber?: string,
    linkedAt?: string,
  ): Promise<CareContext | null>;
  bulkUpdateLinkage(
    tenantId: string,
    updates: Array<{
      careContextId: string;
      abhaLinkageStatus: string;
      abdmReferenceNumber?: string;
      linkedAt?: string;
    }>,
  ): Promise<number>;
}

export interface BundleManifestRepo {
  findByCareContext(
    tenantId: string,
    careContextId: string,
  ): Promise<BundleManifest[]>;
  findById(tenantId: string, id: string): Promise<BundleManifest | null>;
  create(data: CreateBundleManifestData): Promise<BundleManifest>;
}

export interface BundleStorageRepo {
  findById(tenantId: string, id: string): Promise<{ bundleJson: Record<string, unknown> } | null>;
  insert(data: {
    iqTenantId: string;
    bundleJson: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export interface ExternalHealthRecordRepo {
  findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<ExternalHealthRecord[]>;
  findById(
    tenantId: string,
    id: string,
  ): Promise<ExternalHealthRecord | null>;
  create(data: IngestExternalRecordData): Promise<ExternalHealthRecord>;
  markViewed(
    tenantId: string,
    id: string,
    viewedAt: string,
  ): Promise<ExternalHealthRecord | null>;
}

export interface TimelineIndexRepo {
  findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<Array<Record<string, unknown>>>;
}

export interface ErasureLogRepo {
  insert(data: {
    iqTenantId: string;
    erasedEntityKind: string;
    erasedEntityId: string;
    consentArtifactId?: string;
    patientId: string;
    dataEraseAt: string;
    reason: string;
  }): Promise<void>;
}
