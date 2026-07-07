/**
 * Resolve a specific active token number to its summary + registration prefill,
 * or null when the token is not found / redeemed / outside today's window.
 */

import type { ScanShareRepository } from "./ports.js";
import { buildResolvedToken, type ResolvedShareToken } from "./profile-mapping.js";
import { activeWindowSince, istIssueDate } from "./time.js";

export async function prefillFromToken(
  input: { iqTenantId: string; facilityIdRef: string; tokenNumber: number },
  deps: { repo: ScanShareRepository; now: () => Date },
): Promise<ResolvedShareToken | null> {
  const now = deps.now();
  const row = await deps.repo.findByToken({
    iqTenantId: input.iqTenantId,
    facilityIdRef: input.facilityIdRef,
    issueDate: istIssueDate(now),
    tokenNumber: input.tokenNumber,
    since: activeWindowSince(now),
  });
  return row ? buildResolvedToken(row, now) : null;
}
