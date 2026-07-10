import type { FastifyInstance } from "fastify";
import { bearerTokenFromHeaders } from "../lib/bearer-token.js";
import { assertPharmacyInternalAccess } from "../http/assert-pharmacy-internal-access.js";
import type { PharmacyHandlerDeps } from "../ports.js";
import type { SaveDispenseForVisitInput, SaveWalkInDispenseInput } from "../domain/pharmacy.types.js";
import {
  DispenseVisitNotFoundError,
  getDispenseForVisit,
} from "../use-cases/get-dispense-for-visit.js";
import { listPharmacyQueue } from "../use-cases/list-pharmacy-queue.js";
import {
  DispensePatientMismatchError,
  DispensePrescriptionMismatchError,
  DispenseValidationError,
  saveDispenseForVisit,
} from "../use-cases/save-dispense-for-visit.js";
import {
  applyOpdQueueProjectionUpsert,
  mapOpdQueueProjectionRowToWire,
  removeOpdQueueProjection,
} from "../use-cases/upsert-opd-queue-projection.js";
import type { OpdQueueProjectionUpsertRequest } from "../use-cases/upsert-opd-queue-projection.js";

type QueueQuery = {
  page?: string;
  limit?: string;
  queued_from?: string;
  queued_to?: string;
  q?: string;
  status?: string;
  kind?: string;
};

type VisitParams = {
  visitId: string;
};

type RecordParams = {
  recordId: string;
};

function actorIdFromRequest(request: { user?: { userId?: string } }): string | null {
  const id = request.user?.userId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function registerPharmacyHandlers(app: FastifyInstance, deps: PharmacyHandlerDeps): void {
  app.get<{ Querystring: QueueQuery }>(
    "/queue",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const page = request.query.page ? Number.parseInt(request.query.page, 10) : undefined;
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : undefined;

      try {
        const result = await listPharmacyQueue(
          {
            queueProjectionRepo: deps.queueProjectionRepo,
          },
          request.tenantId,
          {
            page,
            limit,
            queued_from: request.query.queued_from,
            queued_to: request.query.queued_to,
            q: request.query.q,
            status: request.query.status,
            kind: request.query.kind,
          },
        );
        return reply.send(result);
      } catch (error) {
        request.log.error({ err: error }, "pharmacy queue failed");
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Unable to load pharmacy queue",
        });
      }
    },
  );

  app.put<{ Params: VisitParams; Body: OpdQueueProjectionUpsertRequest }>(
    "/internal/opd-queue-projection/:visitId",
    { config: { authMode: "public" } },
    async (request, reply) => {
      assertPharmacyInternalAccess(request);
      try {
        const row = await applyOpdQueueProjectionUpsert(
          {
            queueProjectionRepo: deps.queueProjectionRepo,
            dispenseRecordRepo: deps.dispenseRecordRepo,
            userLookup: deps.userLookup,
          },
          request.tenantId,
          request.params.visitId,
          request.body,
        );
        if (row == null) {
          return reply.code(204).send();
        }
        return reply.send(mapOpdQueueProjectionRowToWire(row));
      } catch (error) {
        request.log.error({ err: error }, "pharmacy projection upsert failed");
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Unable to upsert pharmacy queue projection",
        });
      }
    },
  );

  app.delete<{ Params: VisitParams }>(
    "/internal/opd-queue-projection/:visitId",
    { config: { authMode: "public" } },
    async (request, reply) => {
      assertPharmacyInternalAccess(request);
      await removeOpdQueueProjection(
        { queueProjectionRepo: deps.queueProjectionRepo },
        request.tenantId,
        request.params.visitId,
      );
      return reply.code(204).send();
    },
  );

  app.get<{ Params: VisitParams }>(
    "/visits/:visitId/dispense-order",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await getDispenseForVisit(
          {
            opdGateway: deps.opdGateway,
            dispenseRecordRepo: deps.dispenseRecordRepo,
            masterDataGateway: deps.masterDataGateway,
            userLookup: deps.userLookup,
            queueProjectionRepo: deps.queueProjectionRepo,
          },
          request.tenantId,
          {
            visitId: request.params.visitId,
            bearerToken: bearerTokenFromHeaders(request.headers),
          },
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof DispenseVisitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy get dispense failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to load dispense details for visit",
        });
      }
    },
  );

  app.put<{ Params: VisitParams; Body: SaveDispenseForVisitInput }>(
    "/visits/:visitId/dispense-order",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await saveDispenseForVisit(
          {
            opdGateway: deps.opdGateway,
            dispenseRecordRepo: deps.dispenseRecordRepo,
            masterDataGateway: deps.masterDataGateway,
            userLookup: deps.userLookup,
            queueProjectionRepo: deps.queueProjectionRepo,
          },
          request.tenantId,
          {
            visitId: request.params.visitId,
            patient_id: request.body.patient_id,
            opd_prescription_id: request.body.opd_prescription_id,
            discount: request.body.discount,
            notes: request.body.notes,
            lines: request.body.lines,
            bearerToken: bearerTokenFromHeaders(request.headers),
            createdBy: actorIdFromRequest(request),
          },
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof DispenseVisitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: error.message,
          });
        }
        if (error instanceof DispensePatientMismatchError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        if (error instanceof DispensePrescriptionMismatchError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        if (error instanceof DispenseValidationError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy save dispense failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to save dispense for visit",
        });
      }
    },
  );

  app.post<{ Body: SaveWalkInDispenseInput }>(
    "/walk-in-dispense-orders",
    { config: { authMode: "protected" } },
    async (_request, reply) => {
      return reply.code(410).send({
        statusCode: 410,
        error: "Gone",
        message:
          "Walk-in dispense orders are removed. Register the patient in EMPI and dispense against an OPD visit.",
      });
    },
  );

  app.get<{ Params: RecordParams }>(
    "/walk-in-dispense-orders/:recordId",
    { config: { authMode: "protected" } },
    async (_request, reply) => {
      return reply.code(410).send({
        statusCode: 410,
        error: "Gone",
        message: "Walk-in dispense orders are removed.",
      });
    },
  );

  app.put<{ Params: RecordParams; Body: SaveWalkInDispenseInput }>(
    "/walk-in-dispense-orders/:recordId",
    { config: { authMode: "protected" } },
    async (_request, reply) => {
      return reply.code(410).send({
        statusCode: 410,
        error: "Gone",
        message: "Walk-in dispense orders are removed.",
      });
    },
  );
}
