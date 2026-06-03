import { cn } from '@pulse/utils';

export interface DetailViewFieldProps {
  label: string;
  value: string;
  /** Green badge style (e.g. ABHA fields). */
  highlight?: boolean;
  className?: string;
}

export function DetailViewField({ label, value, highlight, className }: DetailViewFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {highlight ? (
        <span className="mt-0.5 inline-block max-w-full break-words rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-600">
          {value}
        </span>
      ) : (
        <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}
