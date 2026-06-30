import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DrizzleInventoryItemRepository } from "./data-access/items.repo.js";
import { registerItemHandlers } from "./rest-handlers/items.handlers.js";
import { InventoryError } from "./errors.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "./lib/postgres-errors.js";

export interface InventoryRouterOptions {
  itemRepo: DrizzleInventoryItemRepository;
}

async function inventoryRouter(
  app: FastifyInstance,
  options: InventoryRouterOptions,
): Promise<void> {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof InventoryError) {
      return reply.status(error.statusCode).send({
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
      });
    }
    if (isPostgresUniqueViolation(error)) {
      return reply.status(409).send({
        message: "A record with the same unique key already exists",
        code: "CONFLICT",
      });
    }
    if (isPostgresForeignKeyViolation(error)) {
      return reply.status(422).send({
        message: "One or more referenced master records were not found",
        code: "INVALID_REFERENCE",
      });
    }
    throw error;
  });

  registerItemHandlers(app, { itemRepo: options.itemRepo });
}

export function createRouter(options: InventoryRouterOptions) {
  return fp(async (app: FastifyInstance) => inventoryRouter(app, options), {
    fastify: "5.x",
    name: "@hims/inventory",
  });
}
