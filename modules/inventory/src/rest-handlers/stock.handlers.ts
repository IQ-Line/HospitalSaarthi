import type { FastifyInstance } from "fastify";
import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import { getStockBatches } from "../use-cases/get-stock-batches.js";
import { listStock } from "../use-cases/list-stock.js";
import { listStockQuerySchema, stockBatchesQuerySchema } from "./stock.schemas.js";

type StockHandlerDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  storeRepo: StoreRepo;
};

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
}
