import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type { EmpiHttpPort, RegistrationRepo, VisitRepo } from "./ports.js";
import { registerRegistrationsHandler } from "./rest-handlers/registrations.handler.js";
import { registerVisitsHandler } from "./rest-handlers/visits.handler.js";

export interface RegistrationRouterOptions {
  registrationRepo: RegistrationRepo;
  visitRepo: VisitRepo;
  empiGateway: EmpiHttpPort | undefined;
  eventBus: EventBus;
}

async function registrationRouter(
  app: FastifyInstance,
  options: RegistrationRouterOptions,
): Promise<void> {
  registerRegistrationsHandler(app, {
    registrationRepo: options.registrationRepo,
    visitRepo: options.visitRepo,
    empiGateway: options.empiGateway,
    eventBus: options.eventBus,
  });
  registerVisitsHandler(app, {
    visitRepo: options.visitRepo,
    registrationRepo: options.registrationRepo,
    eventBus: options.eventBus,
  });
}

export function createRouter(options: RegistrationRouterOptions) {
  return fp(
    async (app: FastifyInstance) => registrationRouter(app, options),
    { fastify: "5.x", name: "@hims/registration" },
  );
}
