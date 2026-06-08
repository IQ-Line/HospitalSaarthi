import type { FastifyInstance } from "fastify";
import { bearerTokenFromHeaders } from "../lib/bearer-token.js";
import type { PharmacyHandlerDeps } from "../ports.js";
import type { SaveDispenseForVisitInput, SaveWalkInDispenseInput } from "../domain/pharmacy.types.js";
import {
  DispenseVisitNotFoundError,
  getDispenseForVisit,
} from "../use-cases/get-dispense-for-visit.js";
import { listPharmacyQueue } from "../use-cases/list-pharmacy-queue.js";
import {
  DispensePatientMismatchError,
  DispenseValidationError,
  saveDispenseForVisit,
} from "../use-cases/save-dispense-for-visit.js";
import {
  WalkInDispenseNotFoundError,
  getWalkInDispense,
  saveWalkInDispense,
  updateWalkInDispense,
} from "../use-cases/walk-in-dispense.js";

type QueueQuery = {
  page?: string;
  limit?: string;
  queued_from?: string;
  queued_to?: string;
  q?: string;
  status?: string;
};

type VisitParams = {
  visitId: string;
};

type RecordParams = {
  recordId: string;
};

function actorIdFromRequest(request: { user?: { id?: string; sub?: string } }): string | null {
  const id = request.user?.id ?? request.user?.sub;
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
            opdGateway: deps.opdGateway,
            empiGateway: deps.empiGateway,
            userLookup: deps.userLookup,
            dispenseRecordRepo: deps.dispenseRecordRepo,
            walkInDispenseRepo: deps.walkInDispenseRepo,
          },
          request.tenantId,
          {
            page,
            limit,
            queued_from: request.query.queued_from,
            queued_to: request.query.queued_to,
            q: request.query.q,
            status: request.query.status,
            bearerToken: bearerTokenFromHeaders(request.headers),
          },
        );
        return reply.send(result);
      } catch (error) {
        request.log.error({ err: error }, "pharmacy queue failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to load pharmacy queue",
        });
      }
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
    async (request, reply) => {
      try {
        const result = await saveWalkInDispense(
          { walkInDispenseRepo: deps.walkInDispenseRepo, masterDataGateway: deps.masterDataGateway },
          request.tenantId,
          {
            ...request.body,
            createdBy: actorIdFromRequest(request),
            bearerToken: bearerTokenFromHeaders(request.headers),
          },
        );
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof DispenseValidationError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy create walk-in dispense failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to create walk-in dispense order",
        });
      }
    },
  );

  app.get<{ Params: RecordParams }>(
    "/walk-in-dispense-orders/:recordId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await getWalkInDispense(
          {
            walkInDispenseRepo: deps.walkInDispenseRepo,
            masterDataGateway: deps.masterDataGateway,
          },
          request.tenantId,
          request.params.recordId,
          bearerTokenFromHeaders(request.headers),
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof WalkInDispenseNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy get walk-in dispense failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to load walk-in dispense order",
        });
      }
    },
  );

  app.put<{ Params: RecordParams; Body: SaveWalkInDispenseInput }>(
    "/walk-in-dispense-orders/:recordId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await updateWalkInDispense(
          { walkInDispenseRepo: deps.walkInDispenseRepo, masterDataGateway: deps.masterDataGateway },
          request.tenantId,
          {
            recordId: request.params.recordId,
            ...request.body,
            bearerToken: bearerTokenFromHeaders(request.headers),
          },
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof WalkInDispenseNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
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
        request.log.error({ err: error }, "pharmacy update walk-in dispense failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to update walk-in dispense order",
        });
      }
    },
  );
}
