import { Printer, RefreshCw } from 'lucide-react';

import { Button } from '@pulse/ui/button';

import type { QueueSummary, ScanShareStatus } from '@/features/frontdesk/api/scan-share';

type ScanShareQueueTableProps = {
  status: ScanShareStatus | undefined;
  runningToken: number;
  patients: QueueSummary[];
  isLoading: boolean;
  isFetching: boolean;
  onPrintQr: () => void;
  onRefresh: () => void;
  onApplyToken: (tokenNumber: number) => void;
};

export function ScanShareQueueTable({
  status,
  runningToken,
  patients,
  isLoading,
  isFetching,
  onPrintQr,
  onRefresh,
  onApplyToken,
}: ScanShareQueueTableProps) {
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onPrintQr}
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
            onClick={onRefresh}
            disabled={isFetching || !status?.available}
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
            {isLoading ? (
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
                      onClick={() => void onApplyToken(p.token_number)}
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
  );
}
