import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DrizzleInventoryItemRepository } from "./data-access/items.repo.js";
import { registerItemHandlers } from "./rest-handlers/items.handlers.js";

export interface InventoryRouterOptions {
  itemRepo: DrizzleInventoryItemRepository;
}

async function inventoryRouter(
  app: FastifyInstance,
  options: InventoryRouterOptions,
): Promise<void> {
  registerItemHandlers(app, { itemRepo: options.itemRepo });
}

export function createRouter(options: InventoryRouterOptions) {
  return fp(async (app: FastifyInstance) => inventoryRouter(app, options), {
    fastify: "5.x",
    name: "@hims/inventory",
  });
}
