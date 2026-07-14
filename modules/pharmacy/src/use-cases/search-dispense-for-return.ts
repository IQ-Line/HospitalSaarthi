import type { DispenseReturnSearchHit } from "../domain/pharmacy.types.js";
import type { DispenseReturnRepo, SearchDispenseForReturnCriteria } from "../ports.js";

export class DispenseReturnSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenseReturnSearchError";
  }
}

export type SearchDispenseForReturnInput = SearchDispenseForReturnCriteria & {
  page?: number;
  limit?: number;
};

export type SearchDispenseForReturnResult = {
  items: DispenseReturnSearchHit[];
  total: number;
  page: number;
  limit: number;
};

function hasSearchCriterion(criteria: SearchDispenseForReturnCriteria): boolean {
  return [
    criteria.q,
    criteria.bill_number,
    criteria.dispense_number,
    criteria.prescription_number,
    criteria.uhid,
    criteria.patient_name,
    criteria.mobile,
  ].some((value) => Boolean(value?.trim()));
}

export async function searchDispenseForReturn(
  deps: { dispenseReturnRepo: DispenseReturnRepo },
  tenantId: string,
  input: SearchDispenseForReturnInput,
): Promise<SearchDispenseForReturnResult> {
  if (!hasSearchCriterion(input)) {
    throw new DispenseReturnSearchError("At least one search criterion is required");
  }

  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));

  const result = await deps.dispenseReturnRepo.searchEligibleDispenses(
    tenantId,
    input,
    page,
    limit,
  );

  return {
    items: result.items,
    total: result.total,
    page,
    limit,
  };
}
