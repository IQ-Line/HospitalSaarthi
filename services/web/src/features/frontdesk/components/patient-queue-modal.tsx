import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight, Printer, RefreshCw, Search, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import {
  buildScanShareQrValue,
  fetchActiveScanShareTokens,
  fetchScanSharePatientByToken,
  mapScanShareTokenDocToQueuePatient,
  type AbdmIntegrationProfile,
  type QueuePatient,
} from '@/features/frontdesk/api/scan-share-queue';

export interface PatientQueueModalRef {
  removePatient: (token: number) => void;
  findPatientByToken: (token: string) => QueuePatient | null | Promise<QueuePatient | null>;
}

type PatientQueueModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abdmProfile?: AbdmIntegrationProfile | null;
  abdmEnabled?: boolean;
  onPatientSelect?: (patient: QueuePatient) => void;
};

const PATIENTS_PER_PAGE = 10;

function formatDateTime(date: Date): string {
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

export const PatientQueueModal = forwardRef<PatientQueueModalRef, PatientQueueModalProps>(
  function PatientQueueModal({ open, onOpenChange, abdmProfile, abdmEnabled = false, onPatientSelect }, ref) {
    const abdmEnabledResolved = abdmEnabled && Boolean(abdmProfile?.hip_id);

    const [patients, setPatients] = useState<QueuePatient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [runningToken, setRunningToken] = useState(0);
    const [showQrCode, setShowQrCode] = useState(false);
    const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
    const [qrCodeValue, setQrCodeValue] = useState('');
    const qrCodeRef = useRef<HTMLDivElement>(null);

    const hipId = abdmProfile?.hip_id ?? '';
    const facilityName = abdmProfile?.hip_display_name ?? '';

    useEffect(() => {
      if (!showQrCode || !hipId) return;
      setQrCodeValue(
        buildScanShareQrValue({
          hipId,
          facilityName,
          gatewayEnvironment: abdmProfile?.gateway_environment,
        }),
      );
    }, [showQrCode, hipId, facilityName, abdmProfile?.gateway_environment]);

    const fetchActivePatients = useCallback(async () => {
      if (!abdmEnabledResolved) return;
      try {
        const res = await fetchActiveScanShareTokens();
        const mapped = res.data
          .filter((doc) => doc.active)
          .map(mapScanShareTokenDocToQueuePatient)
          .sort((a, b) => a.token - b.token);
        setPatients(mapped);
        setRunningToken(res.runningToken ?? 0);
      } catch {
        if (!abdmEnabledResolved) {
          toast.warning('ABDM is not configured for this tenant');
          return;
        }
        toast.error('Failed to load patient queue');
      }
    }, [abdmEnabledResolved]);

    useImperativeHandle(
      ref,
      () => ({
        removePatient: (token: number) => {
          setPatients((prev) => prev.filter((p) => p.token !== token));
        },
        findPatientByToken: async (token: string) => {
          const numericToken = Number.parseInt(token, 10);
          if (!Number.isNaN(numericToken) && token.trim() === numericToken.toString()) {
            const foundByToken = patients.find((p) => p.token === numericToken);
            if (foundByToken) return foundByToken;
            try {
              const doc = await fetchScanSharePatientByToken(numericToken);
              return mapScanShareTokenDocToQueuePatient(doc);
            } catch {
              return null;
            }
          }

          const foundByAbhaNumber = patients.find(
            (p) => p.abhaNumber && p.abhaNumber.toLowerCase().includes(token.toLowerCase()),
          );
          return foundByAbhaNumber ?? null;
        },
      }),
      [patients],
    );

    const filteredPatients = useMemo(() => {
      if (!searchQuery.trim()) return patients;
      const q = searchQuery.toLowerCase();
      return patients.filter(
        (patient) =>
          (patient.patientName || '').toLowerCase().includes(q) ||
          (patient.phoneNumber || '').includes(searchQuery) ||
          (patient.abhaAddress || '').toLowerCase().includes(q) ||
          (patient.abhaNumber || '').toLowerCase().includes(q) ||
          patient.token.toString().includes(searchQuery),
      );
    }, [searchQuery, patients]);

    useEffect(() => {
      setCurrentPage(1);
    }, [searchQuery, patients.length]);

    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE));
    const startIndex = (currentPage - 1) * PATIENTS_PER_PAGE;
    const currentPatients = filteredPatients.slice(startIndex, startIndex + PATIENTS_PER_PAGE);

    const handlePrintQr = useCallback(() => {
      if (!abdmEnabledResolved) {
        toast.warning('ABDM is not configured for this tenant');
        return;
      }
      setCurrentDateTime(new Date());
      setShowQrCode(true);
    }, [abdmEnabledResolved]);

    const handleRefresh = useCallback(async () => {
      await fetchActivePatients();
      toast.success('Queue refreshed');
    }, [fetchActivePatients]);

    useEffect(() => {
      if (open) {
        void fetchActivePatients();
      }
    }, [open, fetchActivePatients]);

    useEffect(() => {
      void fetchActivePatients();
    }, [fetchActivePatients]);

    useEffect(() => {
      if (!showQrCode) return;
      const interval = window.setInterval(() => setCurrentDateTime(new Date()), 1000);
      return () => window.clearInterval(interval);
    }, [showQrCode]);

    const handleRegister = (patient: QueuePatient) => {
      onPatientSelect?.(patient);
      onOpenChange(false);
    };

    const handleDownloadQr = useCallback(() => {
      const container = qrCodeRef.current;
      if (!container) {
        toast.warning('QR code not ready');
        return;
      }
      const canvas = container.querySelector('canvas');
      if (!canvas) {
        toast.error('Failed to download QR');
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `queue-qr-${hipId || 'facility'}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });
    }, [hipId]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(92dvh,920px)] w-[min(95vw,1400px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base">Pending Token Registrations</DialogTitle>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
            {showQrCode ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 p-4">
                <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-lg border bg-card p-4 shadow-lg">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex-1" />
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={handleDownloadQr}
                      >
                        Print QR Code
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(currentDateTime)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label="Close QR code"
                      onClick={() => setShowQrCode(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <div
                    ref={qrCodeRef}
                    className="flex size-[300px] items-center justify-center rounded-md border bg-white p-4"
                  >
                    {qrCodeValue ? (
                      <QRCodeCanvas
                        value={qrCodeValue}
                        size={260}
                        level="H"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    ) : null}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Scan this QR code to access patient queue information
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handlePrintQr}>
                <Printer className="size-4" />
                Print QR
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Running Token:</span>
                  <Badge variant="secondary">{runningToken}</Badge>
                </div>
                <Button type="button" size="sm" onClick={() => void handleRefresh()}>
                  <RefreshCw className="size-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {!abdmEnabledResolved ? (
              <p className="text-sm text-muted-foreground">
                ABDM integration profile is not configured. Queue and QR will be available once a
                HIP profile is active for this tenant.
              </p>
            ) : null}

            <div className="relative max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-9 pl-9"
                autoComplete="off"
              />
            </div>

            <div className="min-h-[min(58dvh,560px)] flex-1 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>ABHA Address</TableHead>
                    <TableHead>ABHA Number</TableHead>
                    <TableHead>Age/Gender</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No pending tokens in queue
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentPatients.map((patient) => (
                      <TableRow key={patient.token}>
                        <TableCell>{patient.token}</TableCell>
                        <TableCell>{patient.patientName}</TableCell>
                        <TableCell>{patient.phoneNumber}</TableCell>
                        <TableCell className="text-primary">{patient.abhaAddress}</TableCell>
                        <TableCell>{patient.abhaNumber}</TableCell>
                        <TableCell>
                          {patient.age}y, {patient.gender}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegister(patient)}
                          >
                            Register
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm tabular-nums">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);
