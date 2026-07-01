import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzleInventoryGrnRepository } from "./data-access/grn.repo.js";
import { DrizzleInventoryItemRepository } from "./data-access/items.repo.js";
import { DrizzleInventoryStockRepository } from "./data-access/stock.repo.js";
import { createStoreRepo } from "./data-access/store.repo.js";
import { HttpMasterDataGateway } from "./lib/http-master-data-gateway.js";
import type { MasterDataGatewayPort } from "./ports.js";
import { registerGrnHandlers } from "./rest-handlers/grn.handlers.js";
import { registerItemHandlers } from "./rest-handlers/items.handlers.js";
import { registerStockHandlers } from "./rest-handlers/stock.handlers.js";
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

  const itemRepo = new DrizzleInventoryItemRepository(options.db);
  const grnRepo = new DrizzleInventoryGrnRepository(options.db);
  const stockRepo = new DrizzleInventoryStockRepository(options.db);
  const storeRepo = createStoreRepo(options.db);

  registerItemHandlers(app, { itemRepo });
  registerStoreHandlers(app, {
    storeRepo,
    masterDataGateway: options.masterDataGateway,
  });
  registerGrnHandlers(app, { grnRepo, storeRepo, itemRepo });
  registerStockHandlers(app, { stockRepo, storeRepo });
}

export function createRouter(options: InventoryRouterOptions) {
  return fp(async (app) => inventoryRouter(app, options), {
    fastify: "5.x",
    name: "@hims/inventory",
  });
}

export { HttpMasterDataGateway };
