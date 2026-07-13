import type { InventoryGatewayPort, IssueDispenseStockCommand } from "../ports.js";
import { truncateUpstreamBody } from "./upstream-log.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function tenantHeaders(tenantId: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    iq_tenant_id: tenantId,
    "x-tenant-id": tenantId,
  };
  const internalKey = process.env["INVENTORY_INTERNAL_API_KEY"]?.trim();
  if (internalKey) {
    headers["x-inventory-internal-key"] = internalKey;
  }
  return headers;
}

export class InventoryDispenseStockError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "InventoryDispenseStockError";
    this.statusCode = statusCode;
  }
}

export class HttpInventoryGateway implements InventoryGatewayPort {
  constructor(
    private readonly baseUrl: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async issueDispenseStock(
    tenantId: string,
    command: IssueDispenseStockCommand,
  ): Promise<void> {
    if (command.lines.length === 0) {
      return;
    }

    const url = joinUrl(this.baseUrl, "/api/inventory/v1/internal/dispense-stock-issue");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({
          store_id: command.store_id,
          lines: command.lines,
          issue_date: command.issue_date,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options?.warn?.({ tenantId, message }, "Inventory dispense stock issue failed");
      throw error;
    }

    if (response.ok) {
      return;
    }

    const body = await response.text();
    this.options?.warn?.(
      {
        tenantId,
        storeId: command.store_id,
        status: response.status,
        body: truncateUpstreamBody(body),
      },
      "Inventory dispense stock issue rejected",
    );

    let message = `Inventory stock deduction failed (${response.status})`;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message.trim();
      }
    } catch {
      // keep default message
    }

    throw new InventoryDispenseStockError(message, response.status);
  }
}
