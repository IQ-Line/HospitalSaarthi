import type { CheckResourcesResult, PlanResourcesResponse } from "@cerbos/core";

type CacheEntry = CheckResourcesResult | PlanResourcesResponse;

function buildKey(kind: string, id: string, action: string): string {
  return `${kind}:${id}:${action}`;
}

function buildPlanKey(kind: string, action: string): string {
  return `plan:${kind}:${action}`;
}

export class DecisionCache {
  private readonly store = new Map<string, CacheEntry>();

  getCheck(kind: string, id: string, action: string): CheckResourcesResult | undefined {
    return this.store.get(buildKey(kind, id, action)) as CheckResourcesResult | undefined;
  }

  setCheck(kind: string, id: string, action: string, result: CheckResourcesResult): void {
    this.store.set(buildKey(kind, id, action), result);
  }

  getPlan(kind: string, action: string): PlanResourcesResponse | undefined {
    return this.store.get(buildPlanKey(kind, action)) as PlanResourcesResponse | undefined;
  }

  setPlan(kind: string, action: string, result: PlanResourcesResponse): void {
    this.store.set(buildPlanKey(kind, action), result);
  }

  clear(): void {
    this.store.clear();
  }
}
