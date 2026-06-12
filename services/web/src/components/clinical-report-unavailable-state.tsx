import { FileX2 } from 'lucide-react';

interface ClinicalReportUnavailableStateProps {
  title?: string;
  message: string;
}

export function ClinicalReportUnavailableState({
  title = 'Report not available',
  message,
}: ClinicalReportUnavailableStateProps) {
  return (
    <div
      className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-8 py-12 text-center"
      role="status"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileX2 className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
