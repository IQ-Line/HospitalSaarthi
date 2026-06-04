import { Switch } from '@pulse/ui/switch';

interface FormToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Boolean row where only the switch is interactive (label/description are not clickable). */
export function FormToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: FormToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div className="space-y-1 pointer-events-none select-none">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
