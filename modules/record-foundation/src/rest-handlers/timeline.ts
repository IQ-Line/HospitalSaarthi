import type { FastifyInstance } from "fastify";
import type { TimelineIndexRepo } from "../ports.js";
import { timelineQuerySchema } from "./schemas.js";

interface HandlerDeps {
  timelineIndexRepo: TimelineIndexRepo;
}

export function registerTimelineHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.get<{ Querystring: { patient_id: string } }>(
    "/timeline",
    { schema: { querystring: timelineQuerySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { patient_id } = request.query;

      const entries = await deps.timelineIndexRepo.findByPatient(
        tenantId,
        patient_id,
      );

      return reply.send({ data: entries, next_cursor: null });
    },
  );
}
