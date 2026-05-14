import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EmpiPatientsPort, RegistrationRepo } from "./ports.js";
import { registerWorkflowIntakeHandlers } from "./http-handlers/workflow-intake.handler.js";
import { registerRegistrationsHandler } from "./rest-handlers/registrations.handler.js";

export interface RegistrationRouterOptions {
  registrationRepo: RegistrationRepo;
  /** When set, `POST /workflows/new-patient/registrations` creates EMPI patient then encounter row. */
  empiPatientsPort?: EmpiPatientsPort;
}

async function registrationRouter(
  app: FastifyInstance,
  options: RegistrationRouterOptions,
): Promise<void> {
  registerRegistrationsHandler(app, {
    registrationRepo: options.registrationRepo,
  });
  registerWorkflowIntakeHandlers(app, {
    registrationRepo: options.registrationRepo,
    empiPatientsPort: options.empiPatientsPort,
  });
}

export function createRouter(options: RegistrationRouterOptions) {
  return fp(
    async (app: FastifyInstance) => registrationRouter(app, options),
    { fastify: "5.x", name: "@hims/registration", encapsulate: true },
  );
}
