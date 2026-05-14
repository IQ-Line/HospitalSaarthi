/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { RegistrationRepo } from "../ports.js";
import { createRegistration } from "../use-cases/create-registration.js";
import { getRegistration } from "../use-cases/get-registration.js";
import { RegistrationNotFoundError } from "../errors.js";
import {
  createRegistrationBodySchema,
  paramsRegistrationIdSchema,
} from "./route-schemas.js";
import { serializeRegistration } from "./serialize-registration.js";

interface HandlerDeps {
  registrationRepo: RegistrationRepo;
}

export function registerRegistrationsHandler(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.post<{ Body: Record<string, unknown> }>(
    "/registrations",
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
        {
          patient_id: body["patient_id"]!,
          visit_id: body["visit_id"],
          facility_id: body["facility_id"],
          visit_type: body["visit_type"],
          department_id: body["department_id"],
          provider_id: body["provider_id"],
          appointment_id: body["appointment_id"],
          registration_status: body["registration_status"],
          created_by: body["created_by"],
        },
      );
      return reply.code(201).send(serializeRegistration(row));
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
      const tenantId = request.tenantId;
      const { registrationId } = request.params;
      try {
        const row = await getRegistration(
          { registrationRepo: deps.registrationRepo },
          tenantId,
          registrationId,
        );
        return reply.send(serializeRegistration(row));
      } catch (err) {
        if (err instanceof RegistrationNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: err.message,
          });
        }
        throw err;
      }
    },
  );
}
