import type { FastifyInstance } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import { TransferValidationError } from "../errors.js";
import { assertInventoryInternalAccess } from "../http/assert-inventory-internal-access.js";
import type { StoreRepo } from "../ports.js";
import {
  issueDispenseStock,
  type IssueDispenseStockInput,
} from "../use-cases/issue-dispense-stock.js";

type DispenseStockIssueDeps = {
  db: DbInstance;
  storeRepo: StoreRepo;
};

const bodyExample = {
  store_id: "",
  lines: [] as Array<{ item_id: string; quantity: number | string }>,
  issue_date: undefined as string | undefined,
};

function parseIssueBody(raw: unknown): IssueDispenseStockInput {
  const body = (raw ?? {}) as typeof bodyExample;
  const storeId = typeof body.store_id === "string" ? body.store_id.trim() : "";
  const linesRaw = Array.isArray(body.lines) ? body.lines : [];
  const lines = linesRaw.map((line) => ({
    item_id: typeof line?.item_id === "string" ? line.item_id.trim() : "",
    quantity: Number(line?.quantity),
  }));
  return {
    store_id: storeId,
    lines,
    issue_date: typeof body.issue_date === "string" ? body.issue_date : undefined,
  };
}

export function registerDispenseStockIssueHandlers(
  app: FastifyInstance,
  deps: DispenseStockIssueDeps,
): void {
  app.post(
    "/internal/dispense-stock-issue",
    { config: { authMode: "public" } },
    async (request, reply) => {
      assertInventoryInternalAccess(request);
      try {
        const input = parseIssueBody(request.body);
        const result = await issueDispenseStock(
          { db: deps.db, storeRepo: deps.storeRepo },
          request.tenantId,
          input,
        );
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof TransferValidationError) {
          return reply.code(409).send({
            statusCode: 409,
            error: "Conflict",
            message: error.message,
            code: "INSUFFICIENT_STOCK",
          });
        }
        throw error;
      }
    },
  );
}
