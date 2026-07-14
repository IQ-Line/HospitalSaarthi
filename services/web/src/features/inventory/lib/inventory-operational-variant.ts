export type InventoryOperationalVariant = 'inventory' | 'pharmacy';

export type OperationalRouteContext = {
  variant: InventoryOperationalVariant;
  moduleLabel: string;
  routePrefix: '/inventory' | '/pharmacy';
};

export function resolveOperationalContext(
  variant: InventoryOperationalVariant = 'inventory',
): OperationalRouteContext {
  if (variant === 'pharmacy') {
    return {
      variant,
      moduleLabel: 'Pharmacy',
      routePrefix: '/pharmacy',
    };
  }
  return {
    variant,
    moduleLabel: 'Inventory',
    routePrefix: '/inventory',
  };
}

export function operationalStockPath(variant: InventoryOperationalVariant): string {
  return `${resolveOperationalContext(variant).routePrefix}/stock`;
}

export function operationalTransfersPath(variant: InventoryOperationalVariant): string {
  return `${resolveOperationalContext(variant).routePrefix}/transfers`;
}

export function operationalNewTransferPath(variant: InventoryOperationalVariant): string {
  return `${resolveOperationalContext(variant).routePrefix}/transfers/new`;
}

/** List path for indents (inventory) / replenishment (pharmacy). */
export function operationalIndentsPath(variant: InventoryOperationalVariant): string {
  return variant === 'pharmacy'
    ? '/pharmacy/replenishment'
    : '/inventory/indents';
}

export function operationalNewIndentPath(variant: InventoryOperationalVariant): string {
  return variant === 'pharmacy'
    ? '/pharmacy/replenishment/new'
    : '/inventory/indents/new';
}

export function operationalIndentDetailPath(
  variant: InventoryOperationalVariant,
  indentId: string,
): string {
  return variant === 'pharmacy'
    ? `/pharmacy/replenishment/${indentId}`
    : `/inventory/indents/${indentId}`;
}

/** @deprecated Use operationalIndentsPath */
export function operationalReplenishmentPath(variant: InventoryOperationalVariant): string {
  return operationalIndentsPath(variant);
}

export const PHARMACY_INDENT_DEFAULTS = {
  indent_type: 'pharmacy_refill' as const,
  fulfillment_route: 'stock_transfer' as const,
};
