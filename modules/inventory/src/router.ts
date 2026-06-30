import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createStoreRepo } from "./data-access/store.repo.js";
import { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";
import type { MasterDataGatewayPort } from "./ports.js";
import { registerInventoryErrorHandler, registerStoreHandlers } from "./rest-handlers/stores.handlers.js";

export type InventoryRouterOptions = {
  db: DbInstance;
  masterDataGateway: MasterDataGatewayPort;
};

async function inventoryRouter(
  app: FastifyInstance,
  options: InventoryRouterOptions,
): Promise<void> {
  registerInventoryErrorHandler(app);

  if (!options.db || !options.masterDataGateway) {
    throw new Error("Inventory router requires db and masterDataGateway");
  }

  registerStoreHandlers(app, {
    storeRepo: createStoreRepo(options.db),
    masterDataGateway: options.masterDataGateway,
  });
}

export function createRouter(options: InventoryRouterOptions) {
  return fp(async (app) => inventoryRouter(app, options), {
    fastify: "5.x",
    name: "@hims/inventory",
  });
}

export { HttpMasterDataGateway };
