/**
 * Active desk queue for a facility today: token-ordered patient summaries plus
 * the running (oldest active) token number. Pure over an injected clock + repo.
 */

import type { ScanShareRepository } from "./ports.js";
import { listPatientSummary } from "./profile-mapping.js";
import { activeWindowSince, istIssueDate } from "./time.js";

export async function listActiveShares(
  input: { iqTenantId: string; facilityIdRef: string },
  deps: { repo: ScanShareRepository; now: () => Date },
): Promise<{ patients: Record<string, unknown>[]; running_token: number }> {
  const now = deps.now();
  const { rows, runningToken } = await deps.repo.listActive({
    iqTenantId: input.iqTenantId,
    facilityIdRef: input.facilityIdRef,
    issueDate: istIssueDate(now),
    since: activeWindowSince(now),
  });
  return {
    patients: rows.map((row) => listPatientSummary(row, now)),
    running_token: runningToken,
  };
}
