import { Switch } from '@pulse/ui/switch';

interface TableActiveToggleProps {
  active: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}

export function TableActiveToggle({
  active,
  disabled,
  onCheckedChange,
}: TableActiveToggleProps) {
  return (
    <div className="inline-flex items-center justify-start py-0.5">
      <Switch
        size="sm"
        checked={Boolean(active)}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={
          active
            ? 'Active. Toggle off to deactivate.'
            : 'Inactive. Toggle on to activate.'
        }
      />
    </div>
  );
}
