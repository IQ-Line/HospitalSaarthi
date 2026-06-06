import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';

export interface CatalogActiveToggleTarget {
  id: string;
  displayName: string;
  isActive: boolean;
}

interface UseCatalogActiveToggleConfirmOptions {
  disabled?: boolean;
  onConfirm: (id: string, nextActive: boolean) => void | Promise<void>;
}

/**
 * Table status column: confirm before PATCHing is_active; only the switch is clickable.
 */
export function useCatalogActiveToggleConfirm({
  disabled,
  onConfirm,
}: UseCatalogActiveToggleConfirmOptions) {
  const [pending, setPending] = useState<CatalogActiveToggleTarget | null>(null);
  const [nextActive, setNextActive] = useState(false);

  const requestToggle = useCallback((target: CatalogActiveToggleTarget, next: boolean) => {
    if (disabled) return;
    if (next === target.isActive) return;
    setPending(target);
    setNextActive(next);
  }, [disabled]);

  const dismiss = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    await onConfirm(pending.id, nextActive);
    setPending(null);
  }, [pending, nextActive, onConfirm]);

  const renderToggle = useCallback(
    (target: CatalogActiveToggleTarget) => (
      <TableActiveToggle
        active={target.isActive}
        disabled={disabled}
        onCheckedChange={(next) => requestToggle(target, next)}
      />
    ),
    [disabled, requestToggle],
  );

  const renderConfirmDialog = useCallback(() => {
    if (!pending) return null;
    const name = pending.displayName.trim() || 'this entry';
    const activating = nextActive;
    return (
      <ConfirmDialog
        open
        onOpenChange={(o) => {
          if (!o) dismiss();
        }}
        title={activating ? `Activate ${name}?` : `Deactivate ${name}?`}
        description={
          activating
            ? `${name} will be visible in catalogue reads for users who can access active entries.`
            : `${name} will be hidden from catalogue reads for non-Admin users. Admin views can still manage inactive entries.`
        }
        confirmLabel={activating ? 'Activate' : 'Deactivate'}
        destructive={!activating}
        onConfirm={() => {
          void confirm();
        }}
      />
    );
  }, [pending, nextActive, dismiss, confirm]);

  return { renderToggle, renderConfirmDialog };
}
