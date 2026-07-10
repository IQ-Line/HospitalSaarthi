import type { FastifyInstance } from "fastify";
import type { CareContextRepo } from "../ports.js";
import { createCareContext } from "../use-cases/create-care-context.js";
import { listCareContexts } from "../use-cases/list-care-contexts.js";
import { getCareContext } from "../use-cases/get-care-context.js";
import {
  createCareContextBodySchema,
  listCareContextsQuerySchema,
  paramsIdSchema,
} from "./schemas.js";

interface HandlerDeps {
  careContextRepo: CareContextRepo;
}

export function registerCareContextHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.get<{
    Querystring: { patient_id?: string; status?: string; limit?: number; offset?: number };
  }>(
    "/care-contexts",
    { schema: { querystring: listCareContextsQuerySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const q = request.query;

      const result = await listCareContexts(
        { careContextRepo: deps.careContextRepo },
        tenantId,
        { patient_id: q.patient_id, status: q.status, limit: q.limit, offset: q.offset },
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

      if (!result) {
        return reply.code(404).send({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "Care context not found",
        });
      }
      return reply.send({ data: result });
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
        tenantId,
        {
          patient_id: body["patient_id"] as string,
          source_origin: body["source_origin"] as string,
          source_system_id: body["source_system_id"] as string,
          source_record_type: body["source_record_type"] as string,
          source_record_id: body["source_record_id"] as string | undefined,
          encounter_id: body["encounter_id"] as string | undefined,
          display: body["display"] as string,
          period_start: new Date(body["period_start"] as string),
          period_end: body["period_end"]
            ? new Date(body["period_end"] as string)
            : undefined,
          status: body["status"] as string | undefined,
        },
      );

      // 201 on a fresh create; 200 when an identical source-tuple context already
      // existed (idempotent replay — see createCareContext).
      return reply.code(result.created ? 201 : 200).send({ data: result.row });
    },
  );
}
