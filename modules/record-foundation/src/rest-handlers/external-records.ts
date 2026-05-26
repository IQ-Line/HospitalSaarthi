import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  ExternalHealthRecordRepo,
  CareContextRepo,
  BundleManifestRepo,
  BundleStorageRepo,
} from "../ports.js";
import { ingestExternalRecord } from "../use-cases/ingest-external-record.js";
import { listExternalRecords } from "../use-cases/list-external-records.js";
import { getExternalRecord } from "../use-cases/get-external-record.js";
import { markExternalRecordViewed } from "../use-cases/mark-external-record-viewed.js";
import {
  paramsIdSchema,
  ingestExternalRecordBodySchema,
  listExternalRecordsQuerySchema,
} from "./schemas.js";

interface HandlerDeps {
  externalHealthRecordRepo: ExternalHealthRecordRepo;
  careContextRepo: CareContextRepo;
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
  eventBus: EventBus;
}

export function registerExternalRecordHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.get<{ Querystring: { patient_id: string } }>(
    "/external-records",
    { schema: { querystring: listExternalRecordsQuerySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { patient_id } = request.query;

      const records = await listExternalRecords(
        { externalHealthRecordRepo: deps.externalHealthRecordRepo },
        tenantId,
        patient_id,
      );

      return reply.send({ data: records, total: records.length });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/external-records",
    { schema: { body: ingestExternalRecordBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      const result = await ingestExternalRecord(
        {
          careContextRepo: deps.careContextRepo,
          bundleManifestRepo: deps.bundleManifestRepo,
          bundleStorageRepo: deps.bundleStorageRepo,
          externalHealthRecordRepo: deps.externalHealthRecordRepo,
        },
        {
          iqTenantId: tenantId,
          patientId: body["patient_id"] as string,
          consentArtifactId: body["consent_artifact_id"] as string,
          bundleJson: body["bundle_json"] as Record<string, unknown>,
          sourceHipId: body["source_hip_id"] as string,
          sourceHipDisplayName: body["source_hip_display_name"] as string | undefined,
          dataEraseAt: new Date(body["data_erase_at"] as string),
          bundleKind: body["bundle_kind"] as string,
          fhirProfileUrl: body["fhir_profile_url"] as string,
          fhirProfileVersion: body["fhir_profile_version"] as string,
          producedAt: new Date(body["produced_at"] as string),
        },
      );

      return reply.code(201).send({ data: result.externalRecord });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/external-records/:id",
    { schema: { params: paramsIdSchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

      const result = await getExternalRecord(
        {
          externalHealthRecordRepo: deps.externalHealthRecordRepo,
          bundleManifestRepo: deps.bundleManifestRepo,
          bundleStorageRepo: deps.bundleStorageRepo,
        },
        tenantId,
        id,
      );

      if (!result) return reply.code(404).send({ error: "External record not found" });
      return reply.send({ data: { ...result.record, bundle: result.bundle } });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/external-records/:id/mark-viewed",
    { schema: { params: paramsIdSchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

      const result = await markExternalRecordViewed(
        { externalHealthRecordRepo: deps.externalHealthRecordRepo },
        tenantId,
        id,
      );

      if (!result) return reply.code(404).send({ error: "External record not found" });
      return reply.send({ data: result });
    },
  );
}
