/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type { RegistrationRepo, VisitRepo } from "../ports.js";
import type { CreateVisitInput, UpdateVisitInput } from "../domain/visit.types.js";
import type { VisitStatus } from "../lib/visit-helpers.js";
import { createVisit } from "../use-cases/create-visit.js";
import { getVisit } from "../use-cases/get-visit.js";
import { listVisits } from "../use-cases/list-visits.js";
import { updateVisit } from "../use-cases/update-visit.js";
import { deleteVisit } from "../use-cases/delete-visit.js";
import { updateVisitStatus, completeVisitIntake } from "../use-cases/update-visit-status.js";
import {
  createVisitBodySchema,
  listVisitsQuerySchema,
  paramsVisitIdSchema,
  patchVisitBodySchema,
  updateVisitStatusBodySchema,
} from "./route-schemas.js";
import { serializeVisit, serializeRegistrationWithVisit } from "./serialize-registration.js";
import {
  idempotencyKeyRequiredResponse,
  readIdempotencyKey,
  resolveActorId,
} from "../lib/registration-helpers.js";
import { parseVisitStatus, visitStatusFromIntakeCompletion } from "../lib/visit-helpers.js";

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
  patient_id?: string;
  facility_id?: string;
  department_id?: string;
  doctor_id?: string;
}

export interface VisitsHandlerDeps {
  visitRepo: VisitRepo;
  registrationRepo: RegistrationRepo;
  eventBus: EventBus;
}

export function registerVisitsHandler(app: FastifyInstance, deps: VisitsHandlerDeps): void {
  app.get<{ Querystring: ListQuery }>(
    "/visits",
    { config: { authMode: "protected" as const }, schema: { querystring: listVisitsQuerySchema } },
    async (request, reply) => {
      const q = request.query;
      const page = Math.max(1, q.page ? Number(q.page) : 1);
      const limit = Math.min(100, Math.max(1, q.limit ? Number(q.limit) : 20));

      const result = await listVisits(
        { visitRepo: deps.visitRepo },
        request.tenantId,
        {
          page,
          limit,
          status: q.status as VisitStatus | undefined,
          patient_id: q.patient_id,
          facility_id: q.facility_id,
          department_id: q.department_id,
          doctor_id: q.doctor_id,
        },
      );
      return reply.send({
        ...result,
        data: result.data.map(serializeVisit),
      });
    },
  );

  app.get<{ Params: { visitId: string } }>(
    "/visits/:visitId",
    { config: { authMode: "protected" as const }, schema: { params: paramsVisitIdSchema } },
    async (request, reply) => {
      const row = await getVisit(
        { visitRepo: deps.visitRepo },
        request.tenantId,
        request.params.visitId,
      );
      if (!row) return reply.code(404).send({ error: "Visit not found" });
      return reply.send(serializeVisit(row));
    },
  );

  app.post<{ Body: CreateVisitInput }>(
    "/visits",
    { config: { authMode: "protected" as const }, schema: { body: createVisitBodySchema } },
    async (request, reply) => {
      const idempotencyKey = readIdempotencyKey(request);
      if (!idempotencyKey) {
        return reply.code(400).send(idempotencyKeyRequiredResponse());
      }

      const result = await createVisit(
        { visitRepo: deps.visitRepo, eventBus: deps.eventBus },
        request.tenantId,
        request.body,
        {
          idempotencyKey,
          actorId: resolveActorId(request),
          initialStatus: visitStatusFromIntakeCompletion(
            request.body.intake_completion ?? "partial",
          ),
        },
      );
      const status = result.created ? 201 : 200;
      return reply.code(status).send(serializeVisit(result.record));
    },
  );

  app.patch<{ Params: { visitId: string }; Body: UpdateVisitInput }>(
    "/visits/:visitId",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsVisitIdSchema, body: patchVisitBodySchema },
    },
    async (request, reply) => {
      const updated = await updateVisit(
        { visitRepo: deps.visitRepo },
        request.tenantId,
        request.params.visitId,
        request.body,
        resolveActorId(request),
      );
      if (!updated) {
        return reply.code(404).send({ error: "Visit not found" });
      }
      return reply.send(serializeVisit(updated));
    },
  );

  app.delete<{ Params: { visitId: string } }>(
    "/visits/:visitId",
    { config: { authMode: "protected" as const }, schema: { params: paramsVisitIdSchema } },
    async (request, reply) => {
      const deleted = await deleteVisit(
        { visitRepo: deps.visitRepo },
        request.tenantId,
        request.params.visitId,
      );
      if (!deleted) {
        return reply.code(404).send({ error: "Visit not found" });
      }
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { visitId: string }; Body: { status: string } }>(
    "/visits/:visitId/status",
    {
      config: { authMode: "protected" as const },
      schema: { params: paramsVisitIdSchema, body: updateVisitStatusBodySchema },
    },
    async (request, reply) => {
      let toStatus: VisitStatus;
      try {
        toStatus = parseVisitStatus(request.body.status);
      } catch {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid visit status",
          code: "invalid_visit_status",
        });
      }

      const updated = await updateVisitStatus(
        { visitRepo: deps.visitRepo },
        request.tenantId,
        request.params.visitId,
        toStatus,
        resolveActorId(request),
      );
      if (!updated) {
        return reply.code(404).send({ error: "Visit not found" });
      }
      return reply.send(serializeVisit(updated));
    },
  );

  app.post<{ Params: { visitId: string } }>(
    "/visits/:visitId/complete",
    { config: { authMode: "protected" as const }, schema: { params: paramsVisitIdSchema } },
    async (request, reply) => {
      const updated = await completeVisitIntake(
        { visitRepo: deps.visitRepo },
        request.tenantId,
        request.params.visitId,
        resolveActorId(request),
      );
      if (!updated) {
        return reply.code(404).send({ error: "Visit not found" });
      }
      const registration = await deps.registrationRepo.findByPatientId(
        request.tenantId,
        updated.patient_id,
      );
      return reply.send(
        serializeRegistrationWithVisit({ registration: registration ?? null, visit: updated }),
      );
    },
  );
}
