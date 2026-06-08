import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createDispenseRecordRepo } from "./data-access/dispense-record.repo.js";
import { createWalkInDispenseRepo } from "./data-access/walk-in-dispense.repo.js";
import { HttpEmpiGateway } from "./lib/http-empi-gateway.js";
import { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";
import { HttpOpdGateway } from "./lib/http-opd-gateway.js";
import type { EmpiGatewayPort, MasterDataGatewayPort, OpdGatewayPort, UserLookupPort } from "./ports.js";
import { registerPharmacyHandlers } from "./rest-handlers/pharmacy.handlers.js";

export interface PharmacyRouterOptions {
  db: DbInstance;
  opdGateway: OpdGatewayPort;
  empiGateway: EmpiGatewayPort;
  masterDataGateway: MasterDataGatewayPort;
  userLookup: UserLookupPort;
}

async function pharmacyRouter(app: FastifyInstance, options: PharmacyRouterOptions): Promise<void> {
  if (
    !options.db ||
    !options.opdGateway ||
    !options.empiGateway ||
    !options.masterDataGateway ||
    !options.userLookup
  ) {
    throw new Error("Pharmacy router requires db, upstream gateways, and user lookup");
  }
  registerPharmacyHandlers(app, {
    dispenseRecordRepo: createDispenseRecordRepo(options.db),
    walkInDispenseRepo: createWalkInDispenseRepo(options.db),
    opdGateway: options.opdGateway,
    empiGateway: options.empiGateway,
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

export { HttpOpdGateway, HttpEmpiGateway, HttpMasterDataGateway };
