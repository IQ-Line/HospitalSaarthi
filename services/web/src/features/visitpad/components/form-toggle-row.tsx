import { Switch } from '@pulse/ui/switch';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

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
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        data-testid={id}
      />
    </div>
  );
}

/** react-hook-form field wired to {@link FormToggleRow} (switch-only interaction). */
export function ControlledFormToggleRow<T extends FieldValues, TT extends FieldValues = T>({
  control,
  name,
  id,
  label,
  description,
  className = 'sm:col-span-2',
}: {
  control: Control<T, unknown, TT>;
  name: FieldPath<T>;
  id: string;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={className}>
          <FormToggleRow
            id={id}
            label={label}
            description={description}
            checked={!!field.value}
            onCheckedChange={field.onChange}
          />
        </div>
      )}
    />
  );
}
