import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { PharmacyError } from "./errors.js";
import { createDispenseRecordRepo } from "./data-access/dispense-record.repo.js";
import { createQueueProjectionRepo } from "./data-access/queue-projection.repo.js";
import { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";
import { HttpOpdGateway } from "./lib/http-opd-gateway.js";
import type { MasterDataGatewayPort, OpdGatewayPort, UserLookupPort } from "./ports.js";
import { registerPharmacyHandlers } from "./rest-handlers/pharmacy.handlers.js";

export interface PharmacyRouterOptions {
  db: DbInstance;
  opdGateway: OpdGatewayPort;
  masterDataGateway: MasterDataGatewayPort;
  userLookup: UserLookupPort;
}

async function pharmacyRouter(app: FastifyInstance, options: PharmacyRouterOptions): Promise<void> {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof PharmacyError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code ?? "Error",
        message: error.message,
      });
    }
    throw error;
  });

  if (!options.db || !options.opdGateway || !options.masterDataGateway || !options.userLookup) {
    throw new Error("Pharmacy router requires db, upstream gateways, and user lookup");
  }
  registerPharmacyHandlers(app, {
    dispenseRecordRepo: createDispenseRecordRepo(options.db),
    queueProjectionRepo: createQueueProjectionRepo(options.db),
    opdGateway: options.opdGateway,
    masterDataGateway: options.masterDataGateway,
    userLookup: options.userLookup,
  });
}

export function createRouter(options: PharmacyRouterOptions) {
  return fp(async (app) => pharmacyRouter(app, options), {
    fastify: "5.x",
    name: "@hims/pharmacy",
  });
}

export { HttpOpdGateway, HttpMasterDataGateway };
