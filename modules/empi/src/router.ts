import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
  SourceRecordRepo,
} from "./ports.js";
import { registerPatientsHandler } from "./rest-handlers/patients.handler.js";

export interface EmpiRouterOptions {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
  sourceRecordRepo: SourceRecordRepo;
  eventBus: EventBus;
  allocatePatientUhid: (tenantId: string) => Promise<string>;
}

async function empiRouter(
  app: FastifyInstance,
  options: EmpiRouterOptions,
): Promise<void> {
  registerPatientsHandler(app, {
    patientRepo: options.patientRepo,
    addressRepo: options.addressRepo,
    identifierRepo: options.identifierRepo,
    eventBus: options.eventBus,
    allocatePatientUhid: options.allocatePatientUhid,
  });
}

export function createRouter(options: EmpiRouterOptions) {
  return fp(
    async (app: FastifyInstance) => empiRouter(app, options),
    { fastify: "5.x", name: "@hims/empi" },
  );
}
