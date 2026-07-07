import type { FastifyInstance } from "fastify";
import { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import { approveIndent, rejectIndent } from "../use-cases/approve-indent.js";
import { cancelIndentDraft } from "../use-cases/cancel-indent-draft.js";
import { fulfillIndent } from "../use-cases/fulfill-indent.js";
import { getIndent } from "../use-cases/get-indent.js";
import {
  checkActiveIndents,
  listIndentItems,
  listIndentStores,
} from "../use-cases/list-indent-helpers.js";
import { listIndents } from "../use-cases/list-indents.js";
import { createIndentDraft, updateIndentDraft } from "../use-cases/save-indent-draft.js";
import { submitIndent } from "../use-cases/submit-indent.js";
import {
  activeIndentCheckQuerySchema,
  approveIndentBodySchema,
  listIndentItemsQuerySchema,
  listIndentsQuerySchema,
  listIndentStoresQuerySchema,
  rejectIndentBodySchema,
  saveIndentDraftBodySchema,
} from "./indents.schemas.js";

type IndentHandlerDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
  storeRepo: StoreRepo;
  itemRepo: DrizzleInventoryItemRepository;
  stockRepo: DrizzleInventoryStockRepository;
  grnRepo: DrizzleInventoryGrnRepository;
};

function actorIdFromRequest(request: {
  user?: { userId?: string; id?: string; sub?: string };
}): string | null {
  const id = request.user?.userId ?? request.user?.id ?? request.user?.sub;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function registerIndentHandlers(app: FastifyInstance, deps: IndentHandlerDeps): void {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/indents",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listIndentsQuerySchema.parse(request.query);
      const page = query.page ?? 1;
      const pageSize = query.page_size ?? 50;
      const data = await listIndents(
        { indentRepo: deps.indentRepo },
        request.tenantId,
        {
          search: query.search,
          status: query.status,
          from_store_id: query.from_store_id,
          to_store_id: query.to_store_id,
          indent_type: query.indent_type,
          include_lines: query.include_lines,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      );
      return reply.send(data);
    },
  );

  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/indents/stores",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listIndentStoresQuerySchema.parse(request.query);
      const data = await listIndentStores(
        { indentRepo: deps.indentRepo, storeRepo: deps.storeRepo },
        request.tenantId,
        query,
      );
      return reply.send(data);
    },
  );

  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/indents/items",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = listIndentItemsQuerySchema.parse(request.query);
      const page = query.page ?? 1;
      const pageSize = query.page_size ?? 100;
      const data = await listIndentItems(
        { stockRepo: deps.stockRepo, itemRepo: deps.itemRepo },
        request.tenantId,
        {
          from_store_id: query.from_store_id,
          search: query.search,
          classification: query.classification,
          active_only: query.active_only,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      );
      return reply.send(data);
    },
  );

  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/indents/active-check",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const query = activeIndentCheckQuerySchema.parse(request.query);
      const data = await checkActiveIndents(
        { indentRepo: deps.indentRepo },
        request.tenantId,
        query,
      );
      return reply.send(data);
    },
  );

  app.post<{ Body: unknown }>(
    "/indents",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = saveIndentDraftBodySchema.parse(request.body);
      const data = await createIndentDraft(
        {
          indentRepo: deps.indentRepo,
          storeRepo: deps.storeRepo,
          itemRepo: deps.itemRepo,
        },
        request.tenantId,
        body,
        actorIdFromRequest(request),
      );
      return reply.status(201).send({ data });
    },
  );

  app.get<{ Params: { indentId: string } }>(
    "/indents/:indentId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await getIndent(
        { indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.indentId,
      );
      return reply.send({ data });
    },
  );

  app.patch<{ Params: { indentId: string }; Body: unknown }>(
    "/indents/:indentId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = saveIndentDraftBodySchema.parse(request.body);
      const data = await updateIndentDraft(
        {
          indentRepo: deps.indentRepo,
          storeRepo: deps.storeRepo,
          itemRepo: deps.itemRepo,
        },
        request.tenantId,
        request.params.indentId,
        body,
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { indentId: string } }>(
    "/indents/:indentId/submit",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await submitIndent(
        { indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.indentId,
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { indentId: string }; Body: unknown }>(
    "/indents/:indentId/approve",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = approveIndentBodySchema.parse(request.body);
      const data = await approveIndent(
        { indentRepo: deps.indentRepo, itemRepo: deps.itemRepo, storeRepo: deps.storeRepo },
        request.tenantId,
        request.params.indentId,
        body.lines,
        actorIdFromRequest(request),
        body.approval_remarks,
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { indentId: string }; Body: unknown }>(
    "/indents/:indentId/reject",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = rejectIndentBodySchema.parse(request.body);
      const data = await rejectIndent(
        { indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.indentId,
        body.reason,
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { indentId: string } }>(
    "/indents/:indentId/cancel",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await cancelIndentDraft(
        { indentRepo: deps.indentRepo },
        request.tenantId,
        request.params.indentId,
      );
      return reply.send({ data });
    },
  );

  app.post<{ Params: { indentId: string } }>(
    "/indents/:indentId/fulfill",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const data = await fulfillIndent(
        {
          indentRepo: deps.indentRepo,
          grnRepo: deps.grnRepo,
          itemRepo: deps.itemRepo,
        },
        request.tenantId,
        request.params.indentId,
        actorIdFromRequest(request),
      );
      return reply.send({ data });
    },
  );
}
