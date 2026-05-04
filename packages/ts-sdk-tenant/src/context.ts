import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  tenantId: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantId(): string {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error(
      "getTenantId() called outside a request context. " +
        "Ensure tenantPlugin is registered and the call originates from a request handler.",
    );
  }
  return ctx.tenantId;
}

export { tenantStorage };
