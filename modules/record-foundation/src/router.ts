import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  CareContextRepo,
  BundleManifestRepo,
  BundleStorageRepo,
  ExternalHealthRecordRepo,
  TimelineIndexRepo,
  ErasureLogRepo,
} from "./ports.js";
import { registerCareContextHandlers } from "./rest-handlers/care-contexts.js";
import { registerBundleHandlers } from "./rest-handlers/bundles.js";
import { registerDisclosureHandlers } from "./rest-handlers/disclosures.js";
import { registerExternalRecordHandlers } from "./rest-handlers/external-records.js";
import { registerTimelineHandlers } from "./rest-handlers/timeline.js";
import { registerAdminHandlers } from "./rest-handlers/admin.js";

export interface RecordFoundationRouterOptions {
  careContextRepo: CareContextRepo;
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
  externalHealthRecordRepo: ExternalHealthRecordRepo;
  timelineIndexRepo: TimelineIndexRepo;
  erasureLogRepo: ErasureLogRepo;
  eventBus: EventBus;
}

async function recordFoundationRouter(
  app: FastifyInstance,
  options: RecordFoundationRouterOptions,
): Promise<void> {
  registerCareContextHandlers(app, {
    careContextRepo: options.careContextRepo,
    bundleManifestRepo: options.bundleManifestRepo,
    eventBus: options.eventBus,
  });
  registerBundleHandlers(app, {
    bundleManifestRepo: options.bundleManifestRepo,
    bundleStorageRepo: options.bundleStorageRepo,
    careContextRepo: options.careContextRepo,
    eventBus: options.eventBus,
  });
  registerDisclosureHandlers(app, {
    careContextRepo: options.careContextRepo,
    bundleManifestRepo: options.bundleManifestRepo,
    bundleStorageRepo: options.bundleStorageRepo,
  });
  registerExternalRecordHandlers(app, {
    externalHealthRecordRepo: options.externalHealthRecordRepo,
    careContextRepo: options.careContextRepo,
    bundleManifestRepo: options.bundleManifestRepo,
    bundleStorageRepo: options.bundleStorageRepo,
    eventBus: options.eventBus,
  });
  registerTimelineHandlers(app, {
    timelineIndexRepo: options.timelineIndexRepo,
  });
  registerAdminHandlers(app);
}

export function createRouter(options: RecordFoundationRouterOptions) {
  return fp(
    async (app: FastifyInstance) => recordFoundationRouter(app, options),
    { fastify: "5.x", name: "@hims/record-foundation" },
  );
}
