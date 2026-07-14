import type { FastifyInstance } from "fastify";
import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import { adjustStock } from "../use-cases/adjust-stock.js";
import { getStockBatches } from "../use-cases/get-stock-batches.js";
import { listExpiringLots } from "../use-cases/list-expiring-lots.js";
import { listStock } from "../use-cases/list-stock.js";
import {
  adjustStockBodySchema,
  listExpiringLotsQuerySchema,
  listStockQuerySchema,
  stockBatchesQuerySchema,
} from "./stock.schemas.js";
import { InventoryValidationError, ItemNotFoundError } from "../errors.js";

type StockHandlerDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  storeRepo: StoreRepo;
};

function actorIdFromRequest(request: { user?: { userId?: string; id?: string; sub?: string } }): string | null {
  const id = request.user?.userId ?? request.user?.id ?? request.user?.sub;
  return id?.trim() ? id : null;
}

export function registerStockHandlers(app: FastifyInstance, deps: StockHandlerDeps): void {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/stock",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listStockQuerySchema.parse(request.query);
      const data = await listStock(
        { stockRepo: deps.stockRepo, storeRepo: deps.storeRepo },
        request.tenantId,
        query,
      );
      return reply.send(data);
    },
  );

  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/stock/expiring-lots",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listExpiringLotsQuerySchema.parse(request.query);
      const data = await listExpiringLots(
        { stockRepo: deps.stockRepo, storeRepo: deps.storeRepo },
        request.tenantId,
        query,
      );
      return reply.send(data);
    },
  );

  app.get<{ Params: { itemId: string }; Querystring: Record<string, string | undefined> }>(
    "/stock/:itemId/batches",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = stockBatchesQuerySchema.parse(request.query);
      const data = await getStockBatches(
        { stockRepo: deps.stockRepo, storeRepo: deps.storeRepo },
        request.tenantId,
        request.params.itemId,
        query,
      );
      return reply.send(data);
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/stock/adjust",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const parsed = adjustStockBodySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new InventoryValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
      }

      try {
        const data = await adjustStock(
          { stockRepo: deps.stockRepo, storeRepo: deps.storeRepo },
          request.tenantId,
          {
            stock_id: parsed.data.stock_id,
            delta: parsed.data.delta,
            reason: parsed.data.reason,
            created_by: actorIdFromRequest(request),
          },
        );
        return reply.send(data);
      } catch (error) {
        if (error instanceof ItemNotFoundError) {
          return reply.code(404).send({ message: error.message, code: error.code });
        }
        throw error;
      }
    },
  );
}
