/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { EmpiHttpPort, RegistrationRepo } from "../ports.js";
import type { CreateRegistrationInput, NewPatientIntakeInput } from "../domain/registration.types.js";
import { createRegistration } from "../use-cases/create-registration.js";
import { getRegistration } from "../use-cases/get-registration.js";
import { listRegistrations } from "../use-cases/list-registrations.js";
import { createIntakeForNewPatient } from "../use-cases/create-intake-for-new-patient.js";
import {
  createRegistrationBodySchema,
  listRegistrationsQuerySchema,
  newPatientIntakeBodySchema,
  paramsRegistrationIdSchema,
} from "./route-schemas.js";
import {
  serializeRegistration,
  serializeRegistrationListItem,
} from "./serialize-registration.js";

interface ListQuery {
  page?: string;
  limit?: string;
  uhid?: string;
  mobile?: string;
  name?: string;
}

export interface RegistrationsHandlerDeps {
  registrationRepo: RegistrationRepo;
  empiGateway: EmpiHttpPort | undefined;
}

export function registerRegistrationsHandler(
  app: FastifyInstance,
  deps: RegistrationsHandlerDeps,
): void {
  app.get<{ Querystring: ListQuery }>(
    "/registrations",
    {
      schema: {
        querystring: listRegistrationsQuerySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const q = request.query;
      const page = Math.max(1, q.page ? Number(q.page) : 1);
      const limit = Math.min(100, Math.max(1, q.limit ? Number(q.limit) : 10));

      try {
        const result = await listRegistrations(
          {
            registrationRepo: deps.registrationRepo,
            empiGateway: deps.empiGateway,
          },
          tenantId,
          {
            page,
            limit,
            uhid: q.uhid,
            mobile: q.mobile,
            name: q.name,
          },
        );
        return reply.send({
          ...result,
          data: result.data.map(serializeRegistrationListItem),
        });
      } catch (err) {
        if (err instanceof Error && err.message === "name_search_too_short") {
          return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "When searching by name, use at least 2 characters (EMPI rule).",
            code: "registration_list_invalid_name",
          });
        }
        if (err instanceof Error && err.message === "empi_gateway_required_for_search") {
          return reply.code(503).send({
            statusCode: 503,
            error: "Service Unavailable",
            message: "Patient search requires EMPI gateway (EMPI_URL)",
            code: "empi_gateway_not_configured",
          });
        }
        request.log.error({ err }, "listRegistrations failed");
        throw err;
      }
    },
  );

  app.get<{ Params: { registrationId: string } }>(
    "/registrations/:registrationId",
    {
      schema: {
        params: paramsRegistrationIdSchema,
      },
    },
    async (request, reply) => {
      const row = await getRegistration(
        { registrationRepo: deps.registrationRepo },
        request.tenantId,
        request.params.registrationId,
      );
      if (!row) return reply.code(404).send({ error: "Registration not found" });
      return reply.send(serializeRegistration(row));
    },
  );

  const postCreate = async (
    request: { tenantId: string; body: CreateRegistrationInput },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const row = await createRegistration(
      { registrationRepo: deps.registrationRepo },
      request.tenantId,
      request.body,
    );
    return reply.code(201).send(serializeRegistration(row));
  };

  app.post<{ Body: CreateRegistrationInput }>(
    "/registrations",
    {
      schema: {
        body: createRegistrationBodySchema,
      },
    },
    async (request, reply) => postCreate(request, reply),
  );

  app.post<{ Body: CreateRegistrationInput }>(
    "/workflows/existing-patient/registrations",
    {
      schema: {
        body: createRegistrationBodySchema,
      },
    },
    async (request, reply) => postCreate(request, reply),
  );

  app.post<{ Body: NewPatientIntakeInput }>(
    "/workflows/new-patient/registrations",
    {
      schema: {
        body: newPatientIntakeBodySchema,
      },
    },
    async (request, reply) => {
      if (!deps.empiGateway) {
        return reply.code(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "EMPI patient gateway not configured on this service instance",
          code: "empi_gateway_not_configured",
        });
      }

      const result = await createIntakeForNewPatient(
        {
          registrationRepo: deps.registrationRepo,
          empiGateway: deps.empiGateway,
        },
        request.tenantId,
        request.body,
      );

      if (!result.ok) {
        if (result.kind === "duplicate") {
          return reply.code(409).send(result.body);
        }
        return reply.code(result.status >= 400 ? result.status : 502).send({
          statusCode: result.status,
          error: "Upstream EMPI error",
          message: result.body,
        });
      }

      const base = serializeRegistration(result.registration);
      const summary = await deps.empiGateway.getPatientSummary(
        request.tenantId,
        result.registration.patient_id,
      );
      return reply.code(201).send({
        ...base,
        patient_uhid: summary?.uhid ?? null,
        patient_full_name: summary?.full_name ?? null,
        patient_phone_number: summary?.phone_number ?? null,
      });
    },
  );
}
