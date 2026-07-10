import { Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { ApiError } from '@/lib/api-client';
import {
  fetchOpdReceiptPdf,
  fetchOpdSlipPdf,
  registrationReportKeys,
  serializeRegistrationReportContext,
  type RegistrationReportQueryContext,
} from '@/features/frontdesk/api/registration-documents';

export type RegistrationReportView = 'slip' | 'receipt';

export interface RegistrationReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  reportContext: RegistrationReportQueryContext;
  /** When set, show only this document (no tabs). */
  singleView?: RegistrationReportView;
  /** Post-registration flow shows "New Patient"; list actions show Close only. */
  footerMode?: 'registration' | 'list';
  onDone?: () => void;
}

/** PDF generation is expensive — cache briefly per registration + context. */
const REPORT_PDF_STALE_MS = 5 * 60 * 1000;
const REPORT_PDF_GC_MS = 30 * 60 * 1000;

function PdfPreviewFrame({
  title,
  blob,
  onLoad,
}: {
  title: string;
  blob: Blob;
  onLoad?: (frame: HTMLIFrameElement) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <div className="overflow-hidden rounded-md border bg-white shadow-sm">
      <iframe
        ref={iframeRef}
        title={title}
        src={objectUrl ?? undefined}
        onLoad={() => {
          const frame = iframeRef.current;
          if (frame && onLoad) onLoad(frame);
        }}
        className="block h-[min(60dvh,900px)] w-full border-0 bg-white"
      />
    </div>
  );
}

function errorMessageFromQuery(error: unknown): string {
  if (error instanceof ApiError) return error.body || error.message;
  if (error instanceof Error) return error.message;
  return 'Could not load document';
}

function resolveModalTitle(
  singleView: RegistrationReportView | undefined,
  hasReceipt: boolean,
): string {
  if (singleView === 'slip') return 'OPD Slip';
  if (singleView === 'receipt') return 'OPD Invoice';
  return hasReceipt ? 'Registration Reports' : 'OPD Slip';
}

/** Renders the pending / error / loaded states for one PDF report query. */
function PdfReportPanel({
  query,
  previewTitle,
  pendingLabel,
  onFrameLoad,
}: {
  query: UseQueryResult<Blob, Error>;
  previewTitle: string;
  pendingLabel: string;
  onFrameLoad: (frame: HTMLIFrameElement) => void;
}) {
  return (
    <>
      {query.isPending ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{pendingLabel}</p>
      ) : null}
      {query.isError ? (
        <p className="py-6 text-sm text-destructive" role="alert">
          {errorMessageFromQuery(query.error)}
        </p>
      ) : null}
      {query.data ? (
        <PdfPreviewFrame title={previewTitle} blob={query.data} onLoad={onFrameLoad} />
      ) : null}
    </>
  );
}

export function RegistrationReportsModal({
  open,
  onOpenChange,
  registrationId,
  reportContext,
  singleView,
  footerMode = 'registration',
  onDone,
}: RegistrationReportsModalProps) {
  const [activeTab, setActiveTab] = useState<RegistrationReportView>('slip');
  const slipFrameRef = useRef<HTMLIFrameElement | null>(null);
  const receiptFrameRef = useRef<HTMLIFrameElement | null>(null);

  const serializedContext = useMemo(
    () => serializeRegistrationReportContext(reportContext),
    [
      reportContext.bill_id,
      reportContext.department_name,
      reportContext.doctor_name,
      reportContext.room_number,
      reportContext.patient_address,
      reportContext.payment_method,
      reportContext.facility_name,
      reportContext.facility_id,
      reportContext.facility_address,
      reportContext.facility_phone,
      reportContext.facility_email,
    ],
  );
  const billId = serializedContext.bill_id;
  const hasReceipt = Boolean(billId);
  const showTabs = !singleView && hasReceipt;
  const effectiveView = singleView ?? activeTab;

  const receiptContext = useMemo(
    () =>
      billId
        ? ({ ...serializedContext, bill_id: billId } as RegistrationReportQueryContext & {
            bill_id: string;
          })
        : null,
    [billId, serializedContext],
  );

  useEffect(() => {
    if (open) {
      setActiveTab(singleView ?? 'slip');
    }
  }, [open, registrationId, singleView]);

  const shouldLoadSlip = open && singleView !== 'receipt';
  const shouldLoadReceipt =
    open && hasReceipt && receiptContext != null && (singleView === 'receipt' || activeTab === 'receipt');

  const slipQuery = useQuery({
    queryKey: registrationReportKeys.slipPdf(registrationId, serializedContext),
    queryFn: () => fetchOpdSlipPdf(registrationId, serializedContext),
    enabled: shouldLoadSlip,
    staleTime: REPORT_PDF_STALE_MS,
    gcTime: REPORT_PDF_GC_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const receiptQuery = useQuery({
    queryKey: registrationReportKeys.receiptPdf(registrationId, receiptContext!),
    queryFn: () => fetchOpdReceiptPdf(registrationId, receiptContext!),
    enabled: shouldLoadReceipt,
    staleTime: REPORT_PDF_STALE_MS,
    gcTime: REPORT_PDF_GC_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handlePrint = () => {
    const frame = effectiveView === 'slip' ? slipFrameRef.current : receiptFrameRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  const modalTitle = resolveModalTitle(singleView, hasReceipt);

  const slipPanel = (
    <PdfReportPanel
      query={slipQuery}
      previewTitle="OPD slip preview"
      pendingLabel="Generating OPD slip PDF…"
      onFrameLoad={(frame) => {
        slipFrameRef.current = frame;
      }}
    />
  );

  const receiptPanel = (
    <>
      {!hasReceipt ? (
        <p className="py-6 text-sm text-muted-foreground" role="status">
          No invoice is linked to this registration.
        </p>
      ) : null}
      <PdfReportPanel
        query={receiptQuery}
        previewTitle="OPD invoice preview"
        pendingLabel="Generating invoice PDF…"
        onFrameLoad={(frame) => {
          receiptFrameRef.current = frame;
        }}
      />
    </>
  );

  const handleClose = () => {
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4">
          {showTabs ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as RegistrationReportView)}
            >
              <TabsList>
                <TabsTrigger value="slip">OPD Slip</TabsTrigger>
                <TabsTrigger value="receipt">OPD Receipt</TabsTrigger>
              </TabsList>

              <TabsContent value="slip" className="mt-4 px-0" forceMount hidden={activeTab !== 'slip'}>
                {slipPanel}
              </TabsContent>

              <TabsContent value="receipt" className="mt-4 px-0" forceMount hidden={activeTab !== 'receipt'}>
                {receiptPanel}
              </TabsContent>
            </Tabs>
          ) : effectiveView === 'receipt' ? (
            receiptPanel
          ) : (
            slipPanel
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2"
              disabled={effectiveView === 'slip' ? !slipQuery.data : !receiptQuery.data}
              onClick={handlePrint}
            >
              <Printer className="size-4" />
              {effectiveView === 'slip' ? 'Print OPD Slip' : 'Print Invoice'}
            </Button>
            {footerMode === 'registration' ? (
              <Button type="button" variant="secondary" onClick={handleClose}>
                New Patient
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
