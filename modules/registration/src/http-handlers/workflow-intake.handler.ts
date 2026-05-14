/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { EmpiPatientsPort, RegistrationRepo } from "../ports.js";
import { createRegistration } from "../use-cases/create-registration.js";
import { createIntakeForNewPatient } from "../use-cases/create-intake-for-new-patient.js";
import { EmpiPatientGatewayNotConfiguredError } from "../errors.js";
import {
  createRegistrationBodySchema,
  newPatientIntakeBodySchema,
} from "../rest-handlers/route-schemas.js";
import { serializeRegistration } from "../rest-handlers/serialize-registration.js";

interface HandlerDeps {
  registrationRepo: RegistrationRepo;
  empiPatientsPort: EmpiPatientsPort | undefined;
}

function mapCreateBodyToRegistrationInput(body: Record<string, string | undefined>) {
  return {
    patient_id: body["patient_id"]!,
    visit_id: body["visit_id"],
    facility_id: body["facility_id"],
    visit_type: body["visit_type"],
    department_id: body["department_id"],
    provider_id: body["provider_id"],
    appointment_id: body["appointment_id"],
    registration_status: body["registration_status"],
    created_by: body["created_by"],
  };
}

export function registerWorkflowIntakeHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.post<{ Body: Record<string, unknown> }>(
    "/workflows/existing-patient/registrations",
    {
      schema: {
        body: createRegistrationBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body as Record<string, string | undefined>;
      const row = await createRegistration(
        { registrationRepo: deps.registrationRepo },
        tenantId,
        mapCreateBodyToRegistrationInput(body),
      );
      return reply.code(201).send(serializeRegistration(row));
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/workflows/new-patient/registrations",
    {
      schema: {
        body: newPatientIntakeBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body as Record<string, unknown>;
      const patient = body["patient"] as Record<string, unknown>;
      try {
        const row = await createIntakeForNewPatient(
          {
            registrationRepo: deps.registrationRepo,
            empiPatientsPort: deps.empiPatientsPort,
          },
          tenantId,
          {
            patient,
            visit_id: body["visit_id"] as string | undefined,
            facility_id: body["facility_id"] as string | undefined,
            visit_type: body["visit_type"] as string | undefined,
            department_id: body["department_id"] as string | undefined,
            provider_id: body["provider_id"] as string | undefined,
            appointment_id: body["appointment_id"] as string | undefined,
            registration_status: body["registration_status"] as string | undefined,
            created_by: body["created_by"] as string | undefined,
          },
        );
        return reply.code(201).send(serializeRegistration(row));
      } catch (err) {
        if (err instanceof EmpiPatientGatewayNotConfiguredError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: "Service Unavailable",
            message: err.message,
            code: "empi_gateway_not_configured",
          });
        }
        throw err;
      }
    },
  );
}
