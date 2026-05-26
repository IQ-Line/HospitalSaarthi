import type { FastifyInstance } from "fastify";
import { adminRebuildQuerySchema, erasureRunBodySchema } from "./schemas.js";

export function registerAdminHandlers(
  app: FastifyInstance,
): void {
  app.post<{ Querystring: { patient_id: string } }>(
    "/admin/timeline/rebuild",
    { schema: { querystring: adminRebuildQuerySchema } },
    async (_request, reply) => {
      return reply.code(202).send({
        data: {
          id: null,
          kind: "timeline_rebuild",
          status: "scheduled",
          started_at: new Date().toISOString(),
        },
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/admin/jobs/:id",
    { schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (_request, reply) => {
      return reply.code(404).send({ error: "Admin job not found" });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/admin/erasure-runs",
    { schema: { body: erasureRunBodySchema } },
    async (_request, reply) => {
      return reply.code(202).send({
        data: {
          id: null,
          kind: "erasure_run",
          status: "scheduled",
          started_at: new Date().toISOString(),
        },
      });
    },
  );
}
