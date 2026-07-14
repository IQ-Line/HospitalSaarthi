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

export function operationalReplenishmentPath(variant: InventoryOperationalVariant): string {
  return `${resolveOperationalContext(variant).routePrefix}/replenishment`;
}

export function operationalNewIndentPath(variant: InventoryOperationalVariant): string {
  return `${resolveOperationalContext(variant).routePrefix}/replenishment/new`;
}

export const PHARMACY_INDENT_DEFAULTS = {
  indent_type: 'pharmacy_refill' as const,
  fulfillment_route: 'stock_transfer' as const,
};
