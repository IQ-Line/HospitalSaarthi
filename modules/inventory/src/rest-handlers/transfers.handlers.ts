import type { FastifyInstance } from "fastify";
import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { StoreRepo } from "../ports.js";
import { createStockTransfer } from "../use-cases/create-stock-transfer.js";
import { getStockTransfer } from "../use-cases/get-stock-transfer.js";
import { listStockTransfers } from "../use-cases/list-stock-transfers.js";
import {
  createStockTransferBodySchema,
  listStockTransfersQuerySchema,
} from "./transfers.schemas.js";

type TransferHandlerDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
  storeRepo: StoreRepo;
};

function actorIdFromRequest(request: { user?: { userId?: string; id?: string; sub?: string } }): string | null {
  const id = request.user?.userId ?? request.user?.id ?? request.user?.sub;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function registerTransferHandlers(app: FastifyInstance, deps: TransferHandlerDeps): void {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/transfers",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listStockTransfersQuerySchema.parse(request.query);
      const page = query.page ?? 1;
      const pageSize = query.page_size ?? 50;
      const data = await listStockTransfers(
        { transferRepo: deps.transferRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        {
          search: query.search,
          status: query.status,
          inventory_indent_id: query.inventory_indent_id,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      );
      return reply.send(data);
    },
  );

  app.post<{ Body: unknown }>(
    "/transfers",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = createStockTransferBodySchema.parse(request.body);
      const data = await createStockTransfer(
        {
          transferRepo: deps.transferRepo,
          indentRepo: deps.indentRepo,
          storeRepo: deps.storeRepo,
        },
        request.tenantId,
        body,
        actorIdFromRequest(request),
      );
      return reply.status(201).send({ data });
    },
  );

  app.get<{ Params: { transferId: string } }>(
    "/transfers/:transferId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await getStockTransfer(
        { transferRepo: deps.transferRepo, indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.transferId,
      );
      return reply.send({ data });
    },
  );
}
