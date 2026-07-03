import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import type { StoreRepo } from "../ports.js";
import type { SaveIndentDraftInput } from "../domain/indent.types.js";
import { validateSaveIndentDraft } from "../domain/indent.validation.js";
import { IndentNotFoundError, IndentValidationError } from "../errors.js";
import { getIndent } from "./get-indent.js";

export type SaveIndentDraftDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
  storeRepo: StoreRepo;
  itemRepo: DrizzleInventoryItemRepository;
};

async function assertStoresActive(deps: SaveIndentDraftDeps, tenantId: string, input: SaveIndentDraftInput) {
  const fromStore = await deps.storeRepo.findById(tenantId, input.from_store_id);
  const toStore = await deps.storeRepo.findById(tenantId, input.to_store_id);
  if (!fromStore?.is_active || !toStore?.is_active) {
    throw new IndentValidationError("Both stores must be active");
  }

  if (fromStore.indent_authority && fromStore.indent_target_store_id) {
    if (fromStore.indent_target_store_id !== input.to_store_id) {
      throw new IndentValidationError("From store is not configured to indent to this target store");
    }
  }
}

async function assertItemsExist(
  deps: SaveIndentDraftDeps,
  tenantId: string,
  input: SaveIndentDraftInput,
) {
  for (const line of input.lines) {
    const item = await deps.itemRepo.findById(tenantId, line.item_id);
    if (!item?.is_active) {
      throw new IndentValidationError(`Item ${line.item_id} is not active`);
    }
  }
}

export async function createIndentDraft(
  deps: SaveIndentDraftDeps,
  tenantId: string,
  input: SaveIndentDraftInput,
  actorId: string | null,
) {
  let validated: SaveIndentDraftInput;
  try {
    validated = validateSaveIndentDraft(input);
  } catch (error) {
    throw new IndentValidationError(error instanceof Error ? error.message : "Invalid indent");
  }

  await assertStoresActive(deps, tenantId, validated);
  await assertItemsExist(deps, tenantId, validated);

  const row = await deps.indentRepo.createDraft(tenantId, validated, actorId);
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, row.id);
}

export async function updateIndentDraft(
  deps: SaveIndentDraftDeps,
  tenantId: string,
  indentId: string,
  input: SaveIndentDraftInput,
) {
  const existing = await deps.indentRepo.findById(tenantId, indentId);
  if (!existing) throw new IndentNotFoundError();
  if (existing.status !== "draft") {
    throw new IndentValidationError("Only draft indents can be edited");
  }

  let validated: SaveIndentDraftInput;
  try {
    validated = validateSaveIndentDraft(input);
  } catch (error) {
    throw new IndentValidationError(error instanceof Error ? error.message : "Invalid indent");
  }

  await assertStoresActive(deps, tenantId, validated);
  await assertItemsExist(deps, tenantId, validated);

  const row = await deps.indentRepo.updateDraft(tenantId, indentId, validated);
  if (!row) throw new IndentNotFoundError();
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}
