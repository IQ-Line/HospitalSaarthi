interface LifestyleRadioGroupProps {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LifestyleRadioGroup({
  name,
  value,
  options,
  onChange,
  disabled,
}: LifestyleRadioGroupProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="size-4"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
