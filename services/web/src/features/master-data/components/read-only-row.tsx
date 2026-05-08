interface ReadOnlyRowProps {
  label: string;
  value: string;
}

export function ReadOnlyRow({ label, value }: ReadOnlyRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
