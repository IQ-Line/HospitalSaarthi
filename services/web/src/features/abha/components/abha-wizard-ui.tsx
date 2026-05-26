import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';

const inlineNameInputClass =
  'inline-block h-6 w-[10.5rem] max-w-[45%] align-baseline rounded-none border-0 border-b border-input bg-transparent px-1 py-0 text-xs font-normal shadow-none focus-visible:ring-0';

export function ConsentCheckboxRow({
  id,
  checked,
  onCheckedChange,
  label,
  labelClassName,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  labelClassName?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 shrink-0"
      />
      <label
        htmlFor={id}
        className={`min-w-0 flex-1 cursor-pointer text-xs font-normal leading-relaxed text-foreground/90 ${labelClassName ?? ''}`}
      >
        {label}
      </label>
    </div>
  );
}

export function ConsentInlineNameRow({
  checkboxId,
  checked,
  onCheckedChange,
  nameValue,
  onNameChange,
  namePlaceholder,
  trailingText,
}: {
  checkboxId: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  nameValue: string;
  onNameChange: (value: string) => void;
  namePlaceholder: string;
  trailingText: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 shrink-0"
      />
      <p className="min-w-0 flex-1 text-xs font-normal leading-relaxed text-foreground/90">
        <label htmlFor={checkboxId} className="cursor-pointer">
          I,&nbsp;
        </label>
        <Input
          value={nameValue}
          placeholder={namePlaceholder}
          onChange={(e) => {
            e.stopPropagation();
            onNameChange(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className={inlineNameInputClass}
          aria-label={namePlaceholder}
        />
        <label htmlFor={checkboxId} className="cursor-pointer">
          {trailingText}
        </label>
      </p>
    </div>
  );
}

export function ProfileDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] items-start gap-x-2 gap-y-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        <span className="text-muted-foreground">: </span>
        {value || '—'}
      </span>
    </div>
  );
}
