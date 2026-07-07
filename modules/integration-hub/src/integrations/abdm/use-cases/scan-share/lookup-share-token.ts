/**
 * Resolve an active token from a free-text desk lookup (`q`): numeric matches
 * the token number, otherwise LIKE-matches the ABHA address / number. Returns
 * the assembled summary + registration prefill, or null when nothing matched.
 */

import type { ScanShareRepository } from "./ports.js";
import { buildResolvedToken, type ResolvedShareToken } from "./profile-mapping.js";
import { activeWindowSince, istIssueDate } from "./time.js";

export async function lookupShareToken(
  input: { iqTenantId: string; facilityIdRef: string; query: string },
  deps: { repo: ScanShareRepository; now: () => Date },
): Promise<ResolvedShareToken | null> {
  const now = deps.now();
  const row = await deps.repo.findByQuery({
    iqTenantId: input.iqTenantId,
    facilityIdRef: input.facilityIdRef,
    issueDate: istIssueDate(now),
    query: input.query,
    since: activeWindowSince(now),
  });
  return row ? buildResolvedToken(row, now) : null;
}
