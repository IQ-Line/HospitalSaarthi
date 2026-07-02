import { useQuery } from '@tanstack/react-query';

import { Printer, RefreshCw, X } from 'lucide-react';

import { useCallback, useEffect, useRef, useState } from 'react';

import { QRCodeCanvas } from 'qrcode.react';

import { toast } from 'sonner';

import { Button } from '@pulse/ui/button';

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

} from '@pulse/ui/dialog';

import { abdmFetch } from '@/features/abha/api/abdm-client';

import { ApiError } from '@/lib/api-client';

import { mutationErrorMessage } from '@/lib/mutation-error';

import { useTenantStore } from '@/stores/tenant.store';

import type { CreateVisitRequestBody } from '@/features/frontdesk/types';



type QueueSummary = {

  token_number: number;

  patient_name: string;

  phone_number: string;

  abha_address: string;

  abha_number: string;

  age_years: number | null;

  gender: string;

};



type PrefillPayload = {

  token_number: number;

  prefill: Partial<CreateVisitRequestBody>;

  freeze_abha?: boolean;

};



export type { PrefillPayload };



export type ScanShareStatus = {

  available: boolean;

  reason?: string;

  hip_id?: string;

  facility_name?: string | null;

  qr_value?: string;

  is_live?: boolean;

};



type ActiveResponse = {

  data: { patients: QueueSummary[]; running_token: number };

};



type PrefillResponse = { data: PrefillPayload };



type StatusResponse = { data: ScanShareStatus };



const UNAVAILABLE_FALLBACK =

  'ABDM scan-and-share is unavailable. Ensure integration-hub-svc is running, the tenant has an ABDM profile, and migration 0005 is applied.';



export async function fetchScanShareStatus(): Promise<ScanShareStatus> {

  try {

    const res = await abdmFetch<StatusResponse>('/scan-share/status');

    return res.data;

  } catch (err) {

    if (err instanceof ApiError && err.status === 404) {

      return {

        available: false,

        reason:

          'No ABDM integration profile for this tenant. Configure HIP ID in Configurator.',

      };

    }

    return {

      available: false,

      reason: mutationErrorMessage(err) || UNAVAILABLE_FALLBACK,

    };

  }

}



export function useScanShareStatus() {

  const tenantId = useTenantStore((s) => s.tenantId ?? s.homeTenantId);

  return useQuery({

    queryKey: ['scan-share', 'status', tenantId],

    queryFn: fetchScanShareStatus,

    staleTime: 60_000,

    retry: 1,

  });

}



const SCAN_SHARE_ACTIVE_STALE_MS = 30_000;



export function useScanShareActive(enabled: boolean) {

  const tenantId = useTenantStore((s) => s.tenantId ?? s.homeTenantId);

  return useQuery({

    queryKey: ['scan-share', 'active', tenantId],

    queryFn: fetchScanShareActive,

    enabled,

    staleTime: SCAN_SHARE_ACTIVE_STALE_MS,

    refetchOnMount: false,

    refetchOnReconnect: false,

    retry: 1,

  });

}



export async function fetchScanShareActive(): Promise<ActiveResponse['data']> {

  const res = await abdmFetch<ActiveResponse>('/scan-share/active');

  return res.data;

}



export async function lookupScanShareToken(query: string): Promise<PrefillPayload> {

  const res = await abdmFetch<PrefillResponse>(

    `/scan-share/lookup?${new URLSearchParams({ q: query }).toString()}`,

  );

  return res.data;

}



export async function fetchScanSharePrefill(tokenNumber: number): Promise<PrefillPayload> {

  const res = await abdmFetch<PrefillResponse>(`/scan-share/token/${tokenNumber}/prefill`);

  return res.data;

}



export async function redeemScanShareToken(tokenNumber: number): Promise<void> {

  await abdmFetch(`/scan-share/token/${tokenNumber}/redeem`, { method: 'PUT' });

}



function formatQrDateTime(date: Date): string {

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



export function mergeScanSharePrefill(

  current: CreateVisitRequestBody,

  prefill: Partial<CreateVisitRequestBody>,

): CreateVisitRequestBody {

  return {

    ...current,

    ...prefill,

    patient: { ...current.patient, ...prefill.patient },

    permanent_address: { ...current.permanent_address, ...prefill.permanent_address },

    residential_address: {

      ...current.residential_address,

      ...prefill.residential_address,

    },

  };

}



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

            <div className="flex min-h-0 flex-1 flex-col px-2 sm:px-4">

              <div className="flex w-full shrink-0 items-start justify-between gap-3">

                <span className="flex-1" />

                <div className="flex flex-col items-center gap-1">

                  <button

                    type="button"

                    className="text-xs text-primary underline disabled:opacity-50"

                    onClick={handleDownloadQr}

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

                    onClick={() => setShowQr(false)}

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

          ) : (

            <>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">

            <Button

              type="button"

              size="sm"

              variant="outline"

              onClick={handlePrintQr}

              disabled={!status?.available || !status.qr_value}

            >

              <Printer className="mr-1 size-4" />

              Print QR

            </Button>

            <div className="flex items-center gap-2">

              <span className="text-sm text-muted-foreground">

                Running token: <strong>{runningToken}</strong>

              </span>

              <Button

                type="button"

                size="sm"

                variant="outline"

                onClick={() => void activeQuery.refetch()}

                disabled={activeQuery.isFetching || !status?.available}

              >

                <RefreshCw className="mr-1 size-4" />

                Refresh

              </Button>

            </div>

          </div>



          <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border">

            <table className="w-full text-sm">

              <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur-sm">

                <tr>

                  <th className="px-3 py-2 text-left">Token</th>

                  <th className="px-3 py-2 text-left">Name</th>

                  <th className="px-3 py-2 text-left">Phone</th>

                  <th className="px-3 py-2 text-left">ABHA Address</th>

                  <th className="px-3 py-2 text-left">ABHA Number</th>

                  <th className="px-3 py-2 text-left">Age/Gender</th>

                  <th className="px-3 py-2 text-right" />

                </tr>

              </thead>

              <tbody>

                {activeQuery.isLoading ? (

                  <tr>

                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">

                      Loading queue…

                    </td>

                  </tr>

                ) : patients.length === 0 ? (

                  <tr>

                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">

                      No pending tokens

                    </td>

                  </tr>

                ) : (

                  patients.map((p) => (

                    <tr key={p.token_number} className="border-t">

                      <td className="px-3 py-2 font-medium">{p.token_number}</td>

                      <td className="px-3 py-2">{p.patient_name}</td>

                      <td className="px-3 py-2">{p.phone_number}</td>

                      <td className="px-3 py-2 text-primary">{p.abha_address}</td>

                      <td className="px-3 py-2">{p.abha_number}</td>

                      <td className="px-3 py-2">

                        {p.age_years != null ? `${p.age_years}y` : '—'}, {p.gender || '—'}

                      </td>

                      <td className="px-3 py-2 text-right">

                        <Button

                          type="button"

                          size="sm"

                          variant="outline"

                          onClick={() => void applyToken(p.token_number)}

                        >

                          Register

                        </Button>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

            </>

          )}

        </div>

    </>

  );

}



export async function submitScanShareTokenLookup(

  query: string,

  onApply: (payload: PrefillPayload) => void,

): Promise<void> {

  const q = query.trim();

  if (!q) return;

  try {

    const data = await lookupScanShareToken(q);

    onApply(data);

    toast.success(`Loaded token ${data.token_number}`);

  } catch {

    toast.error('No patient found for this token');

  }

}


