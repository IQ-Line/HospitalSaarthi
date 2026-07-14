import { apiClient } from '@/lib/api-client';

export type ManualDispenseIssueLine = {
  inventory_item_id: string;
  quantity: string | number;
};

export type ManualDispenseIssueInput = {
  inventory_store_id: string;
  lines: ManualDispenseIssueLine[];
};

export type ManualDispenseIssueResult = {
  inventory_store_id: string;
  line_count: number;
};

/** Deduct FEFO stock for manual / walk-in hub Issue (no visit bill persist). */
export async function issueManualDispenseStock(
  body: ManualDispenseIssueInput,
): Promise<ManualDispenseIssueResult> {
  return apiClient<ManualDispenseIssueResult>('/api/pharmacy/v1/manual-dispense-issues', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
