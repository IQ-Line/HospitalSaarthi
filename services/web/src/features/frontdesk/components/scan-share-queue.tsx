import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';

import {
  UNAVAILABLE_FALLBACK,
  fetchScanSharePrefill,
  useScanShareActive,
  type PrefillPayload,
  type ScanShareStatus,
} from '@/features/frontdesk/api/scan-share';
import { ScanShareQrView } from '@/features/frontdesk/components/scan-share/scan-share-qr-view';
import { ScanShareQueueTable } from '@/features/frontdesk/components/scan-share/scan-share-queue-table';

// Re-exported for existing consumers (e.g. visit-registration-page) that import
// the scan-share data helpers from this module.
export {
  mergeScanSharePrefill,
  redeemScanShareToken,
  submitScanShareTokenLookup,
  useScanShareStatus,
} from '@/features/frontdesk/api/scan-share';
export type { PrefillPayload, ScanShareStatus } from '@/features/frontdesk/api/scan-share';

type ScanShareQueueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (payload: PrefillPayload) => void;
  status: ScanShareStatus | undefined;
  statusLoading?: boolean;
  onRefreshStatus?: () => void;
};

export function ScanShareQueueDialog({
  open,
  onOpenChange,
  onApply,
  status,
  statusLoading,
  onRefreshStatus,
}: ScanShareQueueDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(92dvh,1100px)] w-[min(92vw,72rem)] max-w-[min(92vw,72rem)] sm:max-w-[min(92vw,72rem)] flex-col gap-4 overflow-hidden p-5 sm:p-8">
        {open ? (
          <ScanShareQueueDialogBody
            onOpenChange={onOpenChange}
            onApply={onApply}
            status={status}
            statusLoading={statusLoading}
            onRefreshStatus={onRefreshStatus}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ScanShareQueueDialogBody({
  onOpenChange,
  onApply,
  status,
  statusLoading,
  onRefreshStatus,
}: Omit<ScanShareQueueDialogProps, 'open'>) {
  const [showQr, setShowQr] = useState(false);
  const [qrDateTime, setQrDateTime] = useState(() => new Date());
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const pollActiveQueue = !showQr && status?.available === true;
  const activeQuery = useScanShareActive(pollActiveQueue);

  useEffect(() => {
    if (!showQr) return;
    setQrDateTime(new Date());
    const interval = window.setInterval(() => setQrDateTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [showQr]);

  const handlePrintQr = useCallback(() => {
    if (!status?.available || !status.qr_value) {
      toast.warning(status?.reason ?? UNAVAILABLE_FALLBACK);
      return;
    }
    setQrDateTime(new Date());
    setShowQr(true);
  }, [status]);

  const handleDownloadQr = useCallback(() => {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.warning('QR code not ready');
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `queue-qr-${status?.hip_id ?? 'facility'}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    });
  }, [status?.hip_id]);

  const applyToken = useCallback(
    async (tokenNumber: number) => {
      try {
        const data = await fetchScanSharePrefill(tokenNumber);
        onApply(data);
        onOpenChange(false);
        toast.success(`Loaded token ${tokenNumber}`);
      } catch {
        toast.error('Could not load patient for this token');
      }
    },
    [onApply, onOpenChange],
  );

  const patients = activeQuery.data?.patients ?? [];
  const runningToken = activeQuery.data?.running_token ?? 0;
  const qrValue = status?.qr_value ?? '';

  return (
    <>
      <DialogHeader className="shrink-0">
        <DialogTitle>Pending Token Registrations</DialogTitle>
      </DialogHeader>

      {!statusLoading && status && !status.available ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {status.reason ?? UNAVAILABLE_FALLBACK}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {showQr ? (
          <ScanShareQrView
            qrContainerRef={qrContainerRef}
            qrValue={qrValue}
            qrDateTime={qrDateTime}
            statusLoading={statusLoading}
            status={status}
            onRefreshStatus={onRefreshStatus}
            onDownloadQr={handleDownloadQr}
            onCloseQr={() => setShowQr(false)}
          />
        ) : (
          <ScanShareQueueTable
            status={status}
            runningToken={runningToken}
            patients={patients}
            isLoading={activeQuery.isLoading}
            isFetching={activeQuery.isFetching}
            onPrintQr={handlePrintQr}
            onRefresh={() => void activeQuery.refetch()}
            onApplyToken={applyToken}
          />
        )}
      </div>
    </>
  );
}
