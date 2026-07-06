import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import type { ApproveIndentLineInput } from "../domain/indent.types.js";
import { IndentNotFoundError, IndentValidationError } from "../errors.js";
import type { StoreRepo } from "../ports.js";
import { getIndent } from "./get-indent.js";

export type ApproveIndentDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
  itemRepo: DrizzleInventoryItemRepository;
  storeRepo: StoreRepo;
};

async function assertStoresActiveForApproval(
  deps: ApproveIndentDeps,
  tenantId: string,
  fromStoreId: string,
  toStoreId: string | null,
) {
  const fromStore = await deps.storeRepo.findById(tenantId, fromStoreId);
  if (!fromStore?.is_active) {
    throw new IndentValidationError("Requesting store must be active");
  }
  if (!toStoreId) return;
  const toStore = await deps.storeRepo.findById(tenantId, toStoreId);
  if (!toStore?.is_active) {
    throw new IndentValidationError("Fulfilling store must be active");
  }
}

async function assertPendingApprovalOrThrow(
  deps: Pick<ApproveIndentDeps, "indentRepo">,
  tenantId: string,
  indentId: string,
) {
  const existing = await deps.indentRepo.findById(tenantId, indentId);
  if (!existing) throw new IndentNotFoundError();
  if (existing.status !== "submitted") {
    throw new IndentValidationError("Indent is no longer pending approval");
  }
  return existing;
}

export async function approveIndent(
  deps: ApproveIndentDeps,
  tenantId: string,
  indentId: string,
  lines: ApproveIndentLineInput[],
  actorId: string | null,
  approvalRemarks?: string | null,
) {
  if (!actorId) {
    throw new IndentValidationError("User context is required to approve indent");
  }
  if (!lines.length) {
    throw new IndentValidationError("Approval lines are required");
  }

  const existing = await assertPendingApprovalOrThrow(deps, tenantId, indentId);
  await assertStoresActiveForApproval(
    deps,
    tenantId,
    existing.from_store_id,
    existing.to_store_id,
  );

  const dbLines = await deps.indentRepo.listLines(tenantId, indentId);
  const lineMap = new Map(dbLines.map((line) => [line.id, line]));
  for (const input of lines) {
    const line = lineMap.get(input.line_id);
    if (!line) {
      throw new IndentValidationError("Invalid indent line");
    }
    const item = await deps.itemRepo.findById(tenantId, line.item_id);
    if (!item?.is_active) {
      throw new IndentValidationError(
        `Item ${item?.item_code ?? line.item_id} is inactive and cannot be approved`,
      );
    }
  }

  const row = await deps.indentRepo.approve(
    tenantId,
    indentId,
    lines,
    actorId,
    approvalRemarks,
  );
  if (!row) {
    await assertPendingApprovalOrThrow(deps, tenantId, indentId);
    throw new IndentValidationError("Indent is no longer pending approval");
  }
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}

export async function rejectIndent(
  deps: Pick<ApproveIndentDeps, "indentRepo">,
  tenantId: string,
  indentId: string,
  reason: string,
) {
  await assertPendingApprovalOrThrow(deps, tenantId, indentId);

  const row = await deps.indentRepo.reject(tenantId, indentId, reason);
  if (!row) {
    await assertPendingApprovalOrThrow(deps, tenantId, indentId);
    throw new IndentValidationError("Indent is no longer pending approval");
  }
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}
