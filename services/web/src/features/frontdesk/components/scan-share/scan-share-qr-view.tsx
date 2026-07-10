import { X } from 'lucide-react';
import { type RefObject } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

import { Button } from '@pulse/ui/button';

import { UNAVAILABLE_FALLBACK, type ScanShareStatus } from '@/features/frontdesk/api/scan-share';

export function formatQrDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

type ScanShareQrViewProps = {
  qrContainerRef: RefObject<HTMLDivElement | null>;
  qrValue: string;
  qrDateTime: Date;
  statusLoading?: boolean;
  status: ScanShareStatus | undefined;
  onRefreshStatus?: () => void;
  onDownloadQr: () => void;
  onCloseQr: () => void;
};

export function ScanShareQrView({
  qrContainerRef,
  qrValue,
  qrDateTime,
  statusLoading,
  status,
  onRefreshStatus,
  onDownloadQr,
  onCloseQr,
}: ScanShareQrViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 sm:px-4">
      <div className="flex w-full shrink-0 items-start justify-between gap-3">
        <span className="flex-1" />
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            className="text-xs text-primary underline disabled:opacity-50"
            onClick={onDownloadQr}
            disabled={!qrValue}
          >
            Print QR Code
          </button>
          <span className="text-xs text-muted-foreground">{formatQrDateTime(qrDateTime)}</span>
        </div>
        <div className="flex flex-1 justify-end">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-7"
            onClick={onCloseQr}
            aria-label="Close QR code"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-3">
        <div
          ref={qrContainerRef}
          className="flex size-[min(380px,50vw)] items-center justify-center rounded-md border-2 border-border bg-white p-5 shadow-sm"
        >
          {statusLoading ? (
            <span className="text-sm text-muted-foreground">Loading QR…</span>
          ) : qrValue ? (
            <QRCodeCanvas value={qrValue} size={340} level="H" bgColor="#FFFFFF" fgColor="#000000" />
          ) : (
            <div className="space-y-2 px-4 text-center">
              <p className="text-sm text-destructive">QR is not available</p>
              <p className="text-xs text-muted-foreground">
                {status?.reason ?? UNAVAILABLE_FALLBACK}
              </p>
              {onRefreshStatus ? (
                <Button type="button" size="sm" variant="outline" onClick={onRefreshStatus}>
                  Retry
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 space-y-2 pb-1 text-center">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with the patient&apos;s ABHA PHR app to share profile and receive a
          desk token.
        </p>
        {status?.hip_id ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">HIP ID:</span>{' '}
            <span className="font-mono">{status.hip_id}</span>
            {status.facility_name ? (
              <>
                <span className="mx-1">·</span>
                <span>{status.facility_name}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
