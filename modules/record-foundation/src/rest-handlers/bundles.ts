import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  BundleManifestRepo,
  BundleStorageRepo,
  CareContextRepo,
} from "../ports.js";
import { storeBundle } from "../use-cases/store-bundle.js";
import {
  paramsIdSchema,
  storeBundleBodySchema,
} from "./schemas.js";

interface HandlerDeps {
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
  careContextRepo: CareContextRepo;
  eventBus: EventBus;
}

export function registerBundleHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.get<{ Params: { id: string } }>(
    "/bundles/:id",
    { schema: { params: paramsIdSchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

      const manifest = await deps.bundleManifestRepo.findById(tenantId, id);
      if (!manifest) return reply.code(404).send({ error: "Bundle manifest not found" });

      const storage = await deps.bundleStorageRepo.findById(
        tenantId,
        manifest.bundle_storage_id,
      );
      if (!storage) return reply.code(410).send({ error: "Bundle has been erased" });

      return reply.send(storage.bundleJson);
    },
  );

  app.get<{ Querystring: { care_context_id: string } }>(
    "/bundle-manifests",
    { schema: { querystring: { type: "object", required: ["care_context_id"], properties: { care_context_id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { care_context_id } = request.query;

      const manifests = await deps.bundleManifestRepo.findByCareContext(
        tenantId,
        care_context_id,
      );

      return reply.send({ data: manifests, total: manifests.length });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/bundles",
    { schema: { body: storeBundleBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      const result = await storeBundle(
        {
          bundleManifestRepo: deps.bundleManifestRepo,
          bundleStorageRepo: deps.bundleStorageRepo,
        },
        {
          iqTenantId: tenantId,
          careContextId: body["care_context_id"] as string,
          bundleKind: body["bundle_kind"] as string,
          fhirProfileUrl: body["fhir_profile_url"] as string,
          fhirProfileVersion: body["fhir_profile_version"] as string,
          producerKind: (body["producer_kind"] as string) ?? "platform_module",
          producerId: (body["producer_id"] as string) ?? tenantId,
          bundleJson: body["bundle_json"] as Record<string, unknown>,
          producedAt: new Date(body["produced_at"] as string),
          receivedAt: body["received_at"]
            ? new Date(body["received_at"] as string)
            : undefined,
        },
      );

      return reply.code(201).send({ data: result.manifest });
    },
  );
}
