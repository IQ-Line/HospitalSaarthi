/** When true, wired queries call inventory-svc via BFF (`/api/inventory/v1`). */
export const OPERATIONAL_INVENTORY_API_ENABLED =
  import.meta.env.VITE_INVENTORY_API_ENABLED === 'true';
