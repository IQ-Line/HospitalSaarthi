import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type { EmpiHttpPort, RegistrationRepo } from "./ports.js";
import { registerRegistrationsHandler } from "./rest-handlers/registrations.handler.js";

export interface RegistrationRouterOptions {
  registrationRepo: RegistrationRepo;
  empiGateway: EmpiHttpPort | undefined;
  eventBus: EventBus;
}

async function registrationRouter(
  app: FastifyInstance,
  options: RegistrationRouterOptions,
): Promise<void> {
  registerRegistrationsHandler(app, {
    registrationRepo: options.registrationRepo,
    empiGateway: options.empiGateway,
    eventBus: options.eventBus,
  });
}

export function createRouter(options: RegistrationRouterOptions) {
  return fp(
    async (app: FastifyInstance) => registrationRouter(app, options),
    { fastify: "5.x", name: "@hims/registration" },
  );
}
