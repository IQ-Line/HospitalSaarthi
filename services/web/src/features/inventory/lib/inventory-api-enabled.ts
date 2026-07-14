/**
 * Operational inventory queries call inventory-svc via BFF (`/api/inventory/v1`).
 * Set `VITE_INVENTORY_API_ENABLED=false` only to disable live calls (queries stay idle).
 */
export const OPERATIONAL_INVENTORY_API_ENABLED =
  import.meta.env.VITE_INVENTORY_API_ENABLED !== 'false';
