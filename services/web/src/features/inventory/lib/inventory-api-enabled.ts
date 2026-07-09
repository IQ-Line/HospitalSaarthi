/**
 * When true, operational inventory queries call inventory-svc via BFF (`/api/inventory/v1`).
 *
 * Defaults to on in dev so GRN/stores/items use live APIs without extra env setup.
 * Set `VITE_INVENTORY_API_ENABLED=false` to force mocks during local UI work.
 */
export const OPERATIONAL_INVENTORY_API_ENABLED =
  import.meta.env.VITE_INVENTORY_API_ENABLED === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_INVENTORY_API_ENABLED !== 'false');
