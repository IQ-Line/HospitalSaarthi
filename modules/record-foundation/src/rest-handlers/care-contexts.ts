import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type { CareContextRepo, BundleManifestRepo } from "../ports.js";
import { createCareContext } from "../use-cases/create-care-context.js";
import { listCareContexts } from "../use-cases/list-care-contexts.js";
import { getCareContext } from "../use-cases/get-care-context.js";
import { updateCareContextLinkage } from "../use-cases/update-care-context-linkage.js";
import { bulkUpdateLinkage } from "../use-cases/bulk-update-linkage.js";
import { findDiscoverableContexts } from "../use-cases/find-discoverable-contexts.js";
import {
  createCareContextBodySchema,
  listCareContextsQuerySchema,
  discoverableQuerySchema,
  paramsIdSchema,
  updateLinkageBodySchema,
  bulkUpdateLinkageBodySchema,
} from "./schemas.js";

interface HandlerDeps {
  careContextRepo: CareContextRepo;
  bundleManifestRepo: BundleManifestRepo;
  eventBus: EventBus;
}

export function registerCareContextHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.get<{ Querystring: { patient_id: string; linked?: string; status?: string; source_origin?: string; source_record_type?: string; abha_linkage_status?: string } }>(
    "/care-contexts",
    { schema: { querystring: listCareContextsQuerySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const q = request.query;

      const linked = q.linked !== undefined ? q.linked === "true" : undefined;

      const result = await listCareContexts(
        { careContextRepo: deps.careContextRepo },
        tenantId,
        {
          patient_id: q.patient_id,
          linked,
          status: q.status as never,
          source_origin: q.source_origin as never,
          source_record_type: q.source_record_type as never,
          abha_linkage_status: q.abha_linkage_status as never,
        },
      );

      return reply.send(result);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/care-contexts/:id",
    { schema: { params: paramsIdSchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

      const result = await getCareContext(
        { careContextRepo: deps.careContextRepo },
        tenantId,
        id,
      );

      if (!result) return reply.code(404).send({ error: "Care context not found" });
      return reply.send({ data: result });
    },
  );

  app.get<{ Querystring: { patient_id: string } }>(
    "/care-contexts/discoverable",
    { schema: { querystring: discoverableQuerySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { patient_id } = request.query;

      const result = await findDiscoverableContexts(
        { careContextRepo: deps.careContextRepo },
        tenantId,
        patient_id,
      );

      return reply.send({ data: result, total: result.length });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/care-contexts",
    { schema: { body: createCareContextBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      const result = await createCareContext(
        { careContextRepo: deps.careContextRepo },
        {
          iq_tenant_id: tenantId,
          patient_id: body["patient_id"] as string,
          source_origin: body["source_origin"] as never,
          source_system_id: body["source_system_id"] as string,
          source_record_type: body["source_record_type"] as never,
          source_record_id: body["source_record_id"] as string | undefined,
          encounter_id: body["encounter_id"] as string | undefined,
          display: body["display"] as string,
          period_start: new Date(body["period_start"] as string),
          period_end: body["period_end"]
            ? new Date(body["period_end"] as string)
            : undefined,
          sensitivity_labels: body["sensitivity_labels"] as string[] | undefined,
        },
      );

      return reply.code(201).send({ data: result });
    },
  );

  app.patch<{ Params: { id: string }; Body: { abha_linkage_status: string; abdm_reference_number?: string; linked_at?: string } }>(
    "/care-contexts/:id/linkage",
    { schema: { params: paramsIdSchema, body: updateLinkageBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;
      const { abha_linkage_status, abdm_reference_number, linked_at } = request.body;

      const result = await updateCareContextLinkage(
        { careContextRepo: deps.careContextRepo },
        {
          tenantId,
          careContextId: id,
          abhaLinkageStatus: abha_linkage_status,
          abdmReferenceNumber: abdm_reference_number,
          linkedAt: linked_at,
        },
      );

      if (!result) return reply.code(404).send({ error: "Care context not found" });
      return reply.send({ data: result });
    },
  );

  app.post<{ Body: { updates: Array<{ care_context_id: string; abdm_reference_number: string; linked_at?: string }> } }>(
    "/care-contexts/bulk-update-linkage",
    { schema: { body: bulkUpdateLinkageBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { updates } = request.body;

      const result = await bulkUpdateLinkage(
        { careContextRepo: deps.careContextRepo },
        {
          tenantId,
          updates: updates.map((u) => ({
            careContextId: u.care_context_id,
            abdmReferenceNumber: u.abdm_reference_number,
            linkedAt: u.linked_at,
          })),
        },
      );

      return reply.send(result);
    },
  );
}
