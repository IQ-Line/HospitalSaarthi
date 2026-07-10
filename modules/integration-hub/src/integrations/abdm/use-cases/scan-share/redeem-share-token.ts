/**
 * Redeem a desk token: mark the issuance redeemed + inactive. Returns false
 * when nothing matched (token not found, already redeemed, or outside today) —
 * the guard the caller maps to 404. Pure over an injected clock + repo.
 */

import type { ScanShareRepository } from "./ports.js";
import { istIssueDate } from "./time.js";

export async function redeemShareToken(
  input: { iqTenantId: string; facilityIdRef: string; tokenNumber: number },
  deps: { repo: ScanShareRepository; now: () => Date },
): Promise<boolean> {
  return deps.repo.redeem({
    iqTenantId: input.iqTenantId,
    facilityIdRef: input.facilityIdRef,
    issueDate: istIssueDate(deps.now()),
    tokenNumber: input.tokenNumber,
  });
}
