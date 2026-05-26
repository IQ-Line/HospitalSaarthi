export { createRouter } from "./router.js";
export type { RecordFoundationRouterOptions } from "./router.js";

export type {
  CareContextRepo,
  BundleManifestRepo,
  BundleStorageRepo,
  ExternalHealthRecordRepo,
  TimelineIndexRepo,
  ErasureLogRepo,
} from "./ports.js";

export { DrizzleCareContextRepo } from "./data-access/drizzle-care-contexts.repo.js";
export { DrizzleBundleManifestRepo } from "./data-access/drizzle-bundle-manifests.repo.js";
export { DrizzleBundleStorageRepo } from "./data-access/drizzle-bundle-storage.repo.js";
export { DrizzleExternalHealthRecordRepo } from "./data-access/drizzle-external-records.repo.js";
export { DrizzleTimelineIndexRepo } from "./data-access/drizzle-timeline-index.repo.js";
export { DrizzleErasureLogRepo } from "./data-access/drizzle-erasure-log.repo.js";

export type {
  CareContext,
  CreateCareContextData,
  CareContextFilters,
} from "./domain/care-context.js";
export type {
  BundleManifest,
  CreateBundleManifestData,
} from "./domain/bundle-manifest.js";
export type {
  ExternalHealthRecord,
  IngestExternalRecordData,
} from "./domain/external-record.js";
export type {
  DisclosureRequest,
  DisclosureEntry,
  DisclosureResponse,
} from "./domain/disclosure.js";

export {
  recordFoundationSchema,
  careContexts,
  recordBundleManifests,
  bundleStorage,
  externalHealthRecords,
  timelineIndex,
  erasureLog,
} from "./schema/tables.js";
