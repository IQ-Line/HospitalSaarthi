import { Loader2, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { ApiError } from '@/lib/api-client';
import { printClinicalReportFromHtml } from '@/lib/clinical-report-print';
import { PrintableReportTemplate } from '@/components/printable-report-template';
import {
  CLINICAL_REPORT_LABELS,
  clinicalReportKeys,
  fetchClinicalReportHtml,
  type ClinicalReportQueryContext,
  type ClinicalReportType,
} from '@/features/opd-patients/api/clinical-documents';

export interface ClinicalReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string | null;
  reportType: ClinicalReportType | null;
  reportContext?: ClinicalReportQueryContext;
}

const REPORT_HTML_STALE_MS = 5 * 60 * 1000;
const REPORT_HTML_GC_MS = 30 * 60 * 1000;

export function ClinicalReportModal({
  open,
  onOpenChange,
  visitId,
  reportType,
  reportContext,
}: ClinicalReportModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const htmlQuery = useQuery({
    queryKey:
      visitId && reportType
        ? clinicalReportKeys.html(visitId, reportType, reportContext)
        : ['clinical-reports', 'idle'],
    queryFn: () => fetchClinicalReportHtml(visitId!, reportType!, reportContext),
    enabled: open && Boolean(visitId && reportType),
    staleTime: REPORT_HTML_STALE_MS,
    gcTime: REPORT_HTML_GC_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const errorMessage = (error: unknown) =>
    error instanceof ApiError
      ? error.body || error.message
      : error instanceof Error
        ? error.message
        : 'Could not load report';

  const handlePrint = async () => {
    if (!htmlQuery.data) {
      toast.warning('Load report to print.');
      return;
    }
    setIsPrinting(true);
    try {
      await printClinicalReportFromHtml(htmlQuery.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not generate PDF for print.',
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const modalTitle =
    reportType != null ? CLINICAL_REPORT_LABELS[reportType] : 'Clinical Report';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,960px)] max-h-[min(90dvh,960px)] w-[min(90vw,1100px)] max-w-[min(90vw,1100px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(90vw,1100px)]">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b px-6 py-4 pr-14">
          <DialogTitle className="text-base font-semibold">{modalTitle}</DialogTitle>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={htmlQuery.isPending || !htmlQuery.data || isPrinting}
            onClick={handlePrint}
          >
            {htmlQuery.isPending || isPrinting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            Print
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden p-0">
          {htmlQuery.isPending ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          {htmlQuery.isError ? (
            <p className="px-6 py-10 text-sm text-destructive" role="alert">
              {errorMessage(htmlQuery.error)}
            </p>
          ) : null}
          {htmlQuery.data ? (
            <PrintableReportTemplate
              html={htmlQuery.data}
              className="h-full"
              iframeRef={iframeRef}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
