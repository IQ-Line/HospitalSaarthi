import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import type { CreateGrnInput, CreateGrnLineInput } from "../domain/grn.types.js";
import {
  assertGrnDateNotFuture,
  assertLineAgainstItem,
} from "../domain/grn.validation.js";
import { GrnValidationError } from "../errors.js";

export type ValidateGrnInputDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export async function validateGrnLinesAgainstItems(
  deps: ValidateGrnInputDeps,
  tenantId: string,
  lines: CreateGrnLineInput[] | undefined,
): Promise<void> {
  if (!lines?.length) return;

  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.item_id)) {
      throw new GrnValidationError("Duplicate item on GRN lines");
    }
    seen.add(line.item_id);

    const item = await deps.itemRepo.findById(tenantId, line.item_id);
    if (!item) {
      throw new GrnValidationError("Invalid item on GRN line");
    }

    assertLineAgainstItem(
      {
        id: item.id,
        item_code: item.item_code,
        tracking_mode: item.tracking_mode,
        is_expirable: item.is_expirable,
        is_active: item.is_active,
      },
      line,
    );
  }
}

export async function validateCreateGrnInput(
  deps: ValidateGrnInputDeps,
  tenantId: string,
  input: CreateGrnInput,
): Promise<void> {
  assertGrnDateNotFuture(input.grn_date);
  await validateGrnLinesAgainstItems(deps, tenantId, input.lines);
}

export async function validateReplaceGrnLines(
  deps: ValidateGrnInputDeps,
  tenantId: string,
  lines: CreateGrnLineInput[],
): Promise<void> {
  if (lines.length === 0) {
    throw new GrnValidationError("Add at least one line with an item");
  }
  await validateGrnLinesAgainstItems(deps, tenantId, lines);
}
