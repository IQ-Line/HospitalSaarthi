import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@pulse/ui/sheet';
import type { InventoryOperationalVariant } from '../lib/inventory-operational-variant';
import { operationalNewIndentPath } from '../lib/inventory-operational-variant';
import type { InventoryStockRow } from '../types';

type InventoryStockIndentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagedItems: InventoryStockRow[];
  onRemoveItem: (itemId: string) => void;
  variant?: InventoryOperationalVariant;
};

export function InventoryStockIndentDrawer({
  open,
  onOpenChange,
  stagedItems,
  onRemoveItem,
  variant = 'inventory',
}: InventoryStockIndentDrawerProps) {
  const newIndentPath = operationalNewIndentPath(variant);
  const itemIds = stagedItems.map((item) => item.id).join(',');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-left">Indent requests</SheetTitle>
          <p className="text-left text-sm text-muted-foreground">
            Select items, then add to a draft indent or create a new one.
          </p>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Staged items ({stagedItems.length})
            </p>
            {stagedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items selected.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stagedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.item_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.item_code}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.item_name}`}
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="button" className="w-full" disabled={stagedItems.length === 0} asChild>
            <Link
              to={newIndentPath}
              search={itemIds ? { itemIds } : undefined}
            >
              + New indent
            </Link>
          </Button>

          <div className="mt-auto rounded-md border border-dashed p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Draft indents
            </p>
            <p className="mt-2 text-sm text-muted-foreground">No draft indents for this store.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function InventoryStockIndentLink({
  variant = 'inventory',
  onClick,
}: {
  variant?: InventoryOperationalVariant;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        Indent
      </Button>
    );
  }

  const newIndentPath = operationalNewIndentPath(variant);
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <Link to={newIndentPath}>Indent</Link>
    </Button>
  );
}
