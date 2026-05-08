import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
  SequenceRepo,
  SourceRecordRepo,
} from "./ports.js";
import { registerPatientsHandler } from "./rest-handlers/patients.handler.js";

export interface EmpiRouterOptions {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
  sequenceRepo: SequenceRepo;
  sourceRecordRepo: SourceRecordRepo;
  eventBus: EventBus;
  getTenantNumericCode: (tenantId: string) => Promise<string>;
}

async function empiRouter(
  app: FastifyInstance,
  options: EmpiRouterOptions,
): Promise<void> {
  registerPatientsHandler(app, {
    patientRepo: options.patientRepo,
    addressRepo: options.addressRepo,
    identifierRepo: options.identifierRepo,
    sequenceRepo: options.sequenceRepo,
    eventBus: options.eventBus,
    getTenantNumericCode: options.getTenantNumericCode,
  });
}

export function createRouter(options: EmpiRouterOptions) {
  return fp(
    async (app: FastifyInstance) => empiRouter(app, options),
    { fastify: "5.x", name: "@hims/empi" },
  );
}
