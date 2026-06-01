/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type { EmpiHttpPort, PicklistReadPort, RegistrationRepo } from "../ports.js";
import type {
  CreateRegistrationInput,
  NewPatientIntakeInput,
  RegistrationStatus,
} from "../domain/registration.types.js";
import { createRegistration } from "../use-cases/create-registration.js";
import { getRegistration } from "../use-cases/get-registration.js";
import { listRegistrations } from "../use-cases/list-registrations.js";
import { createIntakeForNewPatient } from "../use-cases/create-intake-for-new-patient.js";
import { completeRegistrationIntake } from "../use-cases/complete-registration-intake.js";
import {
  dashboardStatsQuerySchema,
  existingPatientRegistrationBodySchema,
  listRegistrationsQuerySchema,
  newPatientIntakeBodySchema,
  paramsRegistrationIdSchema,
} from "./route-schemas.js";
import { getDashboardMetrics } from "../use-cases/get-dashboard-metrics.js";
import { serializeRegistration, type PicklistLabelMaps } from "./serialize-registration.js";
import {
  idempotencyKeyRequiredResponse,
  readIdempotencyKey,
  registrationStatusFromIntakeCompletion,
  resolveActorId,
} from "../lib/registration-helpers.js";

interface DashboardStatsQuery {
  days?: string;
}

interface ListQuery {
  page?: string;
  limit?: string;
  q?: string;
  uhid?: string;
  mobile?: string;
  name?: string;
  status?: string;
  patient_id?: string;
  facility_id?: string;
  department_id?: string;
  provider_id?: string;
}

export interface RegistrationsHandlerDeps {
  registrationRepo: RegistrationRepo;
  empiGateway: EmpiHttpPort | undefined;
  eventBus: EventBus;
  picklistReadPort?: PicklistReadPort;
}

async function loadPicklistLabelMaps(
  picklistReadPort: PicklistReadPort | undefined,
): Promise<PicklistLabelMaps | undefined> {
  if (!picklistReadPort) return undefined;
  const maps = await picklistReadPort.getLabelMaps();
  return {
    visitTypes: maps.visitTypes,
    registrationStatuses: maps.registrationStatuses,
  };
}

export function registerRegistrationsHandler(
  app: FastifyInstance,
  deps: RegistrationsHandlerDeps,
): void {
  app.get<{ Querystring: DashboardStatsQuery }>(
    "/dashboard/stats",
    {
      config: { authMode: "protected" as const },
      schema: { querystring: dashboardStatsQuerySchema },
    },
    async (request, reply) => {
      const days = request.query.days ? Number(request.query.days) : undefined;
      const payload = await getDashboardMetrics(
        { registrationRepo: deps.registrationRepo },
        request.tenantId,
        { days },
      );
      return reply.send(payload);
    },
  );

  app.get<{ Querystring: ListQuery }>(
    "/registrations",
    { config: { authMode: "protected" as const }, schema: { querystring: listRegistrationsQuerySchema } },
    async (request, reply) => {
      const q = request.query;
      const page = Math.max(1, q.page ? Number(q.page) : 1);
      const limit = Math.min(100, Math.max(1, q.limit ? Number(q.limit) : 10));

      try {
        const result = await listRegistrations(
          { registrationRepo: deps.registrationRepo },
          request.tenantId,
          {
            page,
            limit,
            q: q.q,
            uhid: q.uhid,
            mobile: q.mobile,
            name: q.name,
            status: q.status as RegistrationStatus | undefined,
            patient_id: q.patient_id,
            facility_id: q.facility_id,
            department_id: q.department_id,
            provider_id: q.provider_id,
          },
        );
        const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
        return reply.send({
          ...result,
          data: result.data.map((row) => serializeRegistration(row, labelMaps)),
        });
      } catch (err) {
        if (err instanceof Error && err.message === "name_search_too_short") {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "When searching by name, use at least 2 characters.",
            code: "registration_list_invalid_name",
          });
        }
        if (err instanceof Error && err.message === "list_search_params_conflict") {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Use either `q` or legacy `uhid`/`mobile`/`name`, not both.",
            code: "registration_list_search_conflict",
          });
        }
        request.log.error({ err }, "listRegistrations failed");
        throw err;
      }
    },
  );

  app.get<{ Params: { registrationId: string } }>(
    "/registrations/:registrationId",
    { config: { authMode: "protected" as const }, schema: { params: paramsRegistrationIdSchema } },
    async (request, reply) => {
      const row = await getRegistration(
        { registrationRepo: deps.registrationRepo },
        request.tenantId,
        request.params.registrationId,
      );
      if (!row) return reply.code(404).send({ error: "Registration not found" });
      const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
      return reply.send(serializeRegistration(row, labelMaps));
    },
  );

  app.post<{ Body: CreateRegistrationInput }>(
    "/workflows/existing-patient/registrations",
    { config: { authMode: "protected" as const }, schema: { body: existingPatientRegistrationBodySchema } },
    async (request, reply) => {
      const idempotencyKey = readIdempotencyKey(request);
      if (!idempotencyKey) {
        return reply.code(400).send(idempotencyKeyRequiredResponse());
      }

      const result = await createRegistration(
        {
          registrationRepo: deps.registrationRepo,
          eventBus: deps.eventBus,
        },
        request.tenantId,
        request.body,
        {
          idempotencyKey,
          actorId: resolveActorId(request),
          initialStatus: registrationStatusFromIntakeCompletion(
            request.body.intake_completion ?? "partial",
          ),
        },
      );
      const status = result.created ? 201 : 200;
      const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
      return reply.code(status).send(serializeRegistration(result.record, labelMaps));
    },
  );

  app.post<{ Body: NewPatientIntakeInput }>(
    "/workflows/new-patient/registrations",
    { config: { authMode: "protected" as const }, schema: { body: newPatientIntakeBodySchema } },
    async (request, reply) => {
      const idempotencyKey = readIdempotencyKey(request);
      if (!idempotencyKey) {
        return reply.code(400).send(idempotencyKeyRequiredResponse());
      }

      if (!deps.empiGateway) {
        return reply.code(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "EMPI patient gateway not configured on this service instance",
          code: "empi_gateway_not_configured",
        });
      }

      const authHeader = request.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

      const intake = await createIntakeForNewPatient(
        {
          registrationRepo: deps.registrationRepo,
          empiGateway: deps.empiGateway,
          eventBus: deps.eventBus,
        },
        request.tenantId,
        request.body,
        {
          idempotencyKey,
          actorId: resolveActorId(request),
          initialStatus: registrationStatusFromIntakeCompletion(
            request.body.intake_completion ?? "partial",
          ),
          bearerToken,
        },
      );

      if (!intake.ok) {
        if (intake.kind === "duplicate") {
          return reply.code(409).send(intake.body);
        }
        if (intake.kind === "empi_unavailable") {
          return reply.code(503).send({
            statusCode: 503,
            error: "Service Unavailable",
            message: intake.body,
            code: "empi_unavailable",
          });
        }
        return reply.code(intake.status >= 400 ? intake.status : 502).send({
          statusCode: intake.status,
          error: "Upstream EMPI error",
          message: intake.body,
        });
      }

      const status = intake.result.created ? 201 : 200;
      const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
      return reply.code(status).send(serializeRegistration(intake.result.record, labelMaps));
    },
  );

  app.post<{ Params: { registrationId: string } }>(
    "/registrations/:registrationId/complete",
    { config: { authMode: "protected" as const }, schema: { params: paramsRegistrationIdSchema } },
    async (request, reply) => {
      const updated = await completeRegistrationIntake(
        { registrationRepo: deps.registrationRepo },
        request.tenantId,
        request.params.registrationId,
        resolveActorId(request),
      );
      if (!updated) {
        return reply.code(404).send({ error: "Registration not found" });
      }
      const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
      return reply.send(serializeRegistration(updated, labelMaps));
    },
  );
}
