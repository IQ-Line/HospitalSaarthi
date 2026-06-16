import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  ConfiguratorHttpPort,
  EmpiHttpPort,
  OpdHttpPort,
  PicklistReadPort,
  RegistrationRepo,
  VisitRepo,
} from "../ports.js";
import type {
  ExistingPatientVisitInput,
  NewPatientIntakeInput,
} from "../domain/registration.types.js";
import { getRegistration } from "../use-cases/get-registration.js";
import { listRegistrations } from "../use-cases/list-registrations.js";
import {
  createIntakeForNewPatient,
  createVisitForExistingPatient,
} from "../use-cases/create-intake-for-new-patient.js";
import { getVisitTypeDecision } from "../use-cases/get-visit-type-decision.js";
import {
  dashboardStatsQuerySchema,
  existingPatientVisitBodySchema,
  listRegistrationsQuerySchema,
  newPatientIntakeBodySchema,
  paramsRegistrationIdSchema,
  visitTypeDecisionBodySchema,
} from "./route-schemas.js";
import { getDashboardMetrics } from "../use-cases/get-dashboard-metrics.js";
import {
  serializeRegistration,
  serializeRegistrationWithVisit,
  type PicklistLabelMaps,
} from "./serialize-registration.js";
import {
  idempotencyKeyRequiredResponse,
  readIdempotencyKey,
  resolveActorId,
} from "../lib/registration-helpers.js";
import { RegistrationValidationError } from "../lib/follow-up.js";

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
  patient_id?: string;
}

export interface RegistrationsHandlerDeps {
  registrationRepo: RegistrationRepo;
  visitRepo: VisitRepo;
  allocateOpVisitId: (tenantId: string) => Promise<string>;
  empiGateway: EmpiHttpPort | undefined;
  configuratorGateway?: ConfiguratorHttpPort;
  eventBus: EventBus;
  opdGateway?: OpdHttpPort;
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
        { visitRepo: deps.visitRepo },
        request.tenantId,
        { days },
      );
      return reply.send(payload);
    },
  );

  app.post<{
    Body: {
      department_id: string;
      patient?: import("../domain/visit.types.js").VisitTypeDecisionPatientPayload;
    };
  }>(
    "/visit-type-decision",
    {
      config: { authMode: "protected" as const },
      schema: { body: visitTypeDecisionBodySchema },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

      const data = await getVisitTypeDecision(
        {
          visitRepo: deps.visitRepo,
          registrationRepo: deps.registrationRepo,
          configuratorGateway: deps.configuratorGateway,
          empiGateway: deps.empiGateway,
        },
        request.tenantId,
        request.body.department_id,
        request.body.patient,
        bearerToken,
      );
      return reply.send({ success: true, data });
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
          { registrationRepo: deps.registrationRepo, visitRepo: deps.visitRepo },
          request.tenantId,
          {
            page,
            limit,
            q: q.q,
            uhid: q.uhid,
            mobile: q.mobile,
            name: q.name,
            abha_number: q.abha_number,
            abha_address: q.abha_address,
            patient_id: q.patient_id,
          },
        );
        const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
        return reply.send({
          ...result,
          data: result.data.map((row) => serializeRegistrationWithVisit(row, labelMaps)),
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
      const visit = await deps.visitRepo.findLatestByPatientId(request.tenantId, row.patient_id);
      const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
      return reply.send(
        serializeRegistrationWithVisit({ registration: row, visit: visit ?? null }, labelMaps),
      );
    },
  );

  app.post<{ Body: ExistingPatientVisitInput }>(
    "/workflows/existing-patient/registrations",
    { config: { authMode: "protected" as const }, schema: { body: existingPatientVisitBodySchema } },
    async (request, reply) => {
      const idempotencyKey = readIdempotencyKey(request);
      if (!idempotencyKey) {
        return reply.code(400).send(idempotencyKeyRequiredResponse());
      }

      const authHeader = request.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

      if (!deps.empiGateway) {
        return reply.code(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "EMPI patient gateway not configured on this service instance",
          code: "empi_gateway_not_configured",
        });
      }

      try {
        const result = await createVisitForExistingPatient(
          {
            registrationRepo: deps.registrationRepo,
            visitRepo: deps.visitRepo,
            empiGateway: deps.empiGateway,
            allocateOpVisitId: deps.allocateOpVisitId,
            eventBus: deps.eventBus,
            opdGateway: deps.opdGateway,
            configuratorGateway: deps.configuratorGateway,
          },
          request.tenantId,
          request.body,
          {
            idempotencyKey,
            actorId: resolveActorId(request),
            bearerToken,
          },
        );

        const status = result.created ? 201 : 200;
        const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
        return reply.code(status).send(
          serializeRegistrationWithVisit(
            {
              registration: result.registration,
              visit: result.visit,
            },
            labelMaps,
          ),
        );
      } catch (err) {
        if (err instanceof Error && err.message === "empi_patient_not_found") {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Patient not found in EMPI",
            code: "empi_patient_not_found",
          });
        }
        if (err instanceof RegistrationValidationError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: "Bad Request",
            message: err.message,
          });
        }
        throw err;
      }
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

      let intake;
      try {
        intake = await createIntakeForNewPatient(
          {
            registrationRepo: deps.registrationRepo,
            visitRepo: deps.visitRepo,
            empiGateway: deps.empiGateway,
            allocateOpVisitId: deps.allocateOpVisitId,
            eventBus: deps.eventBus,
            opdGateway: deps.opdGateway,
            configuratorGateway: deps.configuratorGateway,
          },
          request.tenantId,
          request.body,
          {
            idempotencyKey,
            actorId: resolveActorId(request),
            bearerToken,
          },
        );
      } catch (err) {
        if (err instanceof RegistrationValidationError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: "Bad Request",
            message: err.message,
          });
        }
        throw err;
      }

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

      const status = intake.created ? 201 : 200;
      const labelMaps = await loadPicklistLabelMaps(deps.picklistReadPort);
      return reply.code(status).send(
        serializeRegistrationWithVisit(intake.result, labelMaps),
      );
    },
  );
}
