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
  DispenseAlreadyIssuedError,
  DispenseInsufficientStockError,
  saveDispenseForVisit,
} from "../use-cases/save-dispense-for-visit.js";
import { issueManualDispenseStock } from "../use-cases/issue-manual-dispense-stock.js";
import {
  applyOpdQueueProjectionUpsert,
  mapOpdQueueProjectionRowToWire,
  removeOpdQueueProjection,
} from "../use-cases/upsert-opd-queue-projection.js";
import type { OpdQueueProjectionUpsertRequest } from "../use-cases/upsert-opd-queue-projection.js";
import type { ProcessDispenseReturnInput } from "../domain/pharmacy.types.js";
import {
  DispenseReturnNotEligibleError,
  getDispenseReturnEligibility,
} from "../use-cases/get-dispense-return-eligibility.js";
import {
  DispenseReturnNotFoundError,
  getDispenseReturn,
  listDispenseReturns,
} from "../use-cases/get-dispense-return.js";
import {
  DispenseReturnConflictError,
  DispenseReturnValidationError,
  processDispenseReturn,
} from "../use-cases/process-dispense-return.js";
import {
  DispenseReturnSearchError,
  searchDispenseForReturn,
} from "../use-cases/search-dispense-for-return.js";

type QueueQuery = {
  page?: string;
  limit?: string;
  queued_from?: string;
  queued_to?: string;
  q?: string;
  status?: string;
  kind?: string;
  doctor_id?: string;
};

type VisitParams = {
  visitId: string;
};

type RecordParams = {
  recordId: string;
};

type DispenseParams = {
  dispenseId: string;
};

type ReturnParams = {
  returnId: string;
};

type ReturnSearchQuery = {
  page?: string;
  limit?: string;
  bill_number?: string;
  dispense_number?: string;
  prescription_number?: string;
  uhid?: string;
  patient_name?: string;
  mobile?: string;
  q?: string;
};

type ReturnListQuery = {
  page?: string;
  limit?: string;
  q?: string;
};

function actorIdFromRequest(request: {
  user?: { userId?: string; id?: string; sub?: string };
}): string | null {
  const id = request.user?.userId ?? request.user?.id ?? request.user?.sub;
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
            doctor_id: request.query.doctor_id,
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
            inventoryGateway: deps.inventoryGateway,
            userLookup: deps.userLookup,
            queueProjectionRepo: deps.queueProjectionRepo,
          },
          request.tenantId,
          {
            visitId: request.params.visitId,
            patient_id: request.body.patient_id,
            opd_prescription_id: request.body.opd_prescription_id,
            inventory_store_id: request.body.inventory_store_id,
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
        if (error instanceof DispenseAlreadyIssuedError) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message: error.message,
          });
        }
        if (error instanceof DispenseInsufficientStockError) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message: error.message,
            code: "INSUFFICIENT_STOCK",
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

  app.post<{
    Body: {
      inventory_store_id: string;
      lines: Array<{ inventory_item_id: string; quantity: string | number }>;
    };
  }>(
    "/manual-dispense-issues",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await issueManualDispenseStock(
          { inventoryGateway: deps.inventoryGateway },
          request.tenantId,
          {
            inventory_store_id: request.body?.inventory_store_id,
            lines: request.body?.lines ?? [],
          },
        );
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof DispenseValidationError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        if (error instanceof DispenseInsufficientStockError) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message: error.message,
            code: "INSUFFICIENT_STOCK",
          });
        }
        request.log.error({ err: error }, "pharmacy manual dispense stock issue failed");
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Unable to deduct inventory stock for manual dispense",
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

  app.get<{ Querystring: ReturnSearchQuery }>(
    "/dispense-transactions/search",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const page = request.query.page ? Number.parseInt(request.query.page, 10) : undefined;
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : undefined;
      try {
        const result = await searchDispenseForReturn(
          { dispenseReturnRepo: deps.dispenseReturnRepo },
          request.tenantId,
          {
            page,
            limit,
            bill_number: request.query.bill_number,
            dispense_number: request.query.dispense_number,
            prescription_number: request.query.prescription_number,
            uhid: request.query.uhid,
            patient_name: request.query.patient_name,
            mobile: request.query.mobile,
            q: request.query.q,
          },
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof DispenseReturnSearchError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy return search failed");
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Unable to search dispense transactions",
        });
      }
    },
  );

  app.get<{ Params: DispenseParams }>(
    "/dispense-transactions/:dispenseId/return-eligibility",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await getDispenseReturnEligibility(
          {
            dispenseReturnRepo: deps.dispenseReturnRepo,
            userLookup: deps.userLookup,
          },
          request.tenantId,
          request.params.dispenseId,
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof DispenseReturnNotEligibleError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy return eligibility failed");
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Unable to load return eligibility",
        });
      }
    },
  );

  app.get<{ Querystring: ReturnListQuery }>(
    "/returns",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const page = request.query.page ? Number.parseInt(request.query.page, 10) : undefined;
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : undefined;
      try {
        const result = await listDispenseReturns(
          { dispenseReturnRepo: deps.dispenseReturnRepo },
          request.tenantId,
          { page, limit, q: request.query.q },
        );
        return reply.send(result);
      } catch (error) {
        request.log.error({ err: error }, "pharmacy return list failed");
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Unable to list returns",
        });
      }
    },
  );

  app.post<{ Body: ProcessDispenseReturnInput }>(
    "/returns",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const idempotencyKey =
        typeof request.headers["idempotency-key"] === "string"
          ? request.headers["idempotency-key"]
          : undefined;
      try {
        const result = await processDispenseReturn(
          {
            dispenseReturnRepo: deps.dispenseReturnRepo,
            queueProjectionRepo: deps.queueProjectionRepo,
          },
          request.tenantId,
          {
            ...request.body,
            processed_by: actorIdFromRequest(request),
            idempotency_key: idempotencyKey,
          },
        );
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof DispenseReturnNotEligibleError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: error.message,
          });
        }
        if (error instanceof DispenseReturnValidationError) {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        if (error instanceof DispenseReturnConflictError) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy process return failed");
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Unable to process return",
        });
      }
    },
  );

  app.get<{ Params: ReturnParams }>(
    "/returns/:returnId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      try {
        const result = await getDispenseReturn(
          {
            dispenseReturnRepo: deps.dispenseReturnRepo,
            userLookup: deps.userLookup,
          },
          request.tenantId,
          request.params.returnId,
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof DispenseReturnNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: error.message,
          });
        }
        request.log.error({ err: error }, "pharmacy get return failed");
        return reply.code(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Unable to load return",
        });
      }
    },
  );
}
