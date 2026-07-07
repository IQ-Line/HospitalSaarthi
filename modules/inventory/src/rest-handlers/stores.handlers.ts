import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { InventoryError } from "../errors.js";
import type { InventoryDeps } from "../ports.js";
import { createStore } from "../use-cases/create-store.js";
import { getStore } from "../use-cases/get-store.js";
import { listStores } from "../use-cases/list-stores.js";
import { updateStore } from "../use-cases/update-store.js";
import type { CreateStoreInput, UpdateStoreInput } from "../domain/store.types.js";

type ListQuery = {
  limit?: string;
  offset?: string;
  search?: string;
  is_active?: string;
};

type StoreParams = {
  storeId: string;
};

function bearerTokenFromHeaders(headers: Record<string, unknown>): string | undefined {
  const raw = headers.authorization ?? headers.Authorization;
  if (typeof raw !== "string") return undefined;
  const match = /^Bearer\s+(\S.*)$/i.exec(raw.trim());
  return match?.[1]?.trim();
}

function actorIdFromRequest(request: { user?: { userId?: string; id?: string; sub?: string } }): string | null {
  const id = request.user?.userId ?? request.user?.id ?? request.user?.sub;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function wireStore(row: Awaited<ReturnType<typeof getStore>>) {
  return {
    id: row.id,
    store_code: row.store_code,
    store_name: row.store_name,
    store_type_id: row.store_type_id,
    facility_id: row.facility_id,
    department_id: row.department_id,
    physical_location: row.physical_location,
    can_receive_stock: row.can_receive_stock,
    can_dispense: row.can_dispense,
    can_issue_to_ward: row.can_issue_to_ward,
    track_batch_expiry: row.track_batch_expiry,
    indent_authority: row.indent_authority,
    indent_target_store_id: row.indent_target_store_id,
    is_central_store: row.is_central_store,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function registerStoreHandlers(app: FastifyInstance, deps: InventoryDeps): void {
  app.get<{ Querystring: ListQuery }>(
    "/stores",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : undefined;
      const offset = request.query.offset ? Number.parseInt(request.query.offset, 10) : undefined;
      const isActiveRaw = request.query.is_active;
      let is_active: boolean | undefined;
      if (isActiveRaw === "true") is_active = true;
      if (isActiveRaw === "false") is_active = false;

      const result = await listStores(deps, request.tenantId, {
        limit,
        offset,
        search: request.query.search,
        is_active,
      });

      return reply.send({
        data: result.data.map(wireStore),
        total: result.total,
      });
    },
  );

  app.get<{ Params: StoreParams }>(
    "/stores/:storeId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const row = await getStore(deps, request.tenantId, request.params.storeId);
      return reply.send({ data: wireStore(row) });
    },
  );

  app.post<{ Body: CreateStoreInput }>(
    "/stores",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const row = await createStore(
        deps,
        request.tenantId,
        request.body,
        actorIdFromRequest(request),
        bearerTokenFromHeaders(request.headers as Record<string, unknown>),
      );
      return reply.status(201).send({ data: wireStore(row) });
    },
  );

  app.patch<{ Params: StoreParams; Body: UpdateStoreInput }>(
    "/stores/:storeId",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const row = await updateStore(
        deps,
        request.tenantId,
        request.params.storeId,
        request.body,
        actorIdFromRequest(request),
        bearerTokenFromHeaders(request.headers as Record<string, unknown>),
      );
      return reply.send({ data: wireStore(row) });
    },
  );
}

function resolveUnhandledErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = (error as { statusCode: unknown }).statusCode;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) {
      return statusCode;
    }
  }
  return 500;
}

function resolveUnhandledErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return "Internal Server Error";
}

export function registerInventoryErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof InventoryError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code ?? "Error",
        message: error.message,
      });
    }
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return reply.status(422).send({
        statusCode: 422,
        error: "Validation Error",
        message: first?.message ?? "Invalid request",
        code: "VALIDATION_ERROR",
      });
    }

    request.log.error({ err: error }, "Unhandled inventory API error");

    const statusCode = resolveUnhandledErrorStatus(error);
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "INTERNAL_SERVER_ERROR";

    return reply.status(statusCode).send({
      statusCode,
      error: statusCode === 500 ? "Internal Server Error" : "Error",
      message: resolveUnhandledErrorMessage(error),
      code,
    });
  });
}
