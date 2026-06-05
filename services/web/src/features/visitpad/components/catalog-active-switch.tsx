import { Switch } from '@pulse/ui/switch';

interface CatalogActiveSwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** When true, helper copy refers to "units"; otherwise "items". */
  entityKind?: 'unit' | 'item';
}

function activeHelperCopy(entityKind: 'unit' | 'item'): string {
  const noun = entityKind === 'unit' ? 'units' : 'items';
  return `Inactive ${noun} are hidden from non-admin catalogue reads.`;
}

/**
 * Active toggle for create/edit dialogs. Label text is not wired to the switch
 * so only the switch control toggles state.
 */
export function CatalogActiveSwitch({
  id,
  checked,
  onCheckedChange,
  entityKind = 'item',
}: CatalogActiveSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div className="space-y-1 pointer-events-none select-none">
        <p className="text-sm font-medium leading-none">Active</p>
        <p className="text-sm text-muted-foreground">{activeHelperCopy(entityKind)}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={checked ? 'Active' : 'Inactive'}
        data-testid={id}
      />
    </div>
  );
}
