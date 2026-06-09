import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  getM3ConsentRequest,
  getM3Transfer,
  startM3ConsentRequest,
  startM3DataRequest,
} from '@/features/abha/api/m3-consent';
import {
  consentStatusLabel,
  dateRangeFromMonths,
  defaultConsentDateRange,
  defaultDataEraseAtLocal,
  DEFAULT_M3_REQUESTER_REG_NO,
  M3_ACCESS_DURATION_MONTHS,
  M3_CONSENT_PURPOSES,
  M3_CONSENT_TERMINAL_STATES,
  M3_HI_TYPES,
  M3_TRANSFER_TERMINAL_STATES,
  toConsentDateRangeIso,
  type M3HiType,
  type M3PurposeCode,
} from '@/features/abha/lib/m3-consent';
import { useAuthStore } from '@/stores/auth.store';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';

const POLL_MS = 3000;

type M3ConsentPanelProps = {
  abhaAddress?: string;
  readOnly?: boolean;
};

export function M3ConsentPanel({ abhaAddress, readOnly = false }: M3ConsentPanelProps) {
  const queryClient = useQueryClient();
  const requesterName = useAuthStore((s) => s.displayName?.trim() || 'Hospital Staff');

  const [phase, setPhase] = useState<'form' | 'requested'>('form');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);

  const [purpose, setPurpose] = useState<M3PurposeCode>('CAREMGT');
  const [dateFrom, setDateFrom] = useState(() => defaultConsentDateRange().from);
  const [dateTo, setDateTo] = useState(() => defaultConsentDateRange().to);
  const [dataEraseAt, setDataEraseAt] = useState(() => defaultDataEraseAtLocal());
  const [allHiTypes, setAllHiTypes] = useState(true);
  const [selectedHiTypes, setSelectedHiTypes] = useState<M3HiType[]>(
    () => M3_HI_TYPES.map((t) => t.value),
  );
  const [forAllHips, setForAllHips] = useState(true);
  const [hipId, setHipId] = useState('');
  const [requesterRegNo, setRequesterRegNo] = useState(DEFAULT_M3_REQUESTER_REG_NO);

  const hasAbha = Boolean(abhaAddress?.trim());

  const consentQuery = useQuery({
    queryKey: ['abdm', 'm3', 'consent', sessionId],
    queryFn: () => getM3ConsentRequest(sessionId!),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => {
      const state = q.state.data?.state;
      if (!state || M3_CONSENT_TERMINAL_STATES.has(state)) return false;
      return POLL_MS;
    },
  });

  const transferQuery = useQuery({
    queryKey: ['abdm', 'm3', 'transfer', transferId],
    queryFn: () => getM3Transfer(transferId!),
    enabled: Boolean(transferId),
    refetchInterval: (q) => {
      const state = q.state.data?.state;
      if (!state || M3_TRANSFER_TERMINAL_STATES.has(state)) return false;
      return POLL_MS;
    },
  });

  const consentState = consentQuery.data?.state;
  const consentArtefactId = consentQuery.data?.consentArtefactIds?.[0];
  const transferState = transferQuery.data?.state;

  const requestMutation = useMutation({
    mutationFn: () => {
      const hiTypes = allHiTypes ? M3_HI_TYPES.map((t) => t.value) : selectedHiTypes;
      if (hiTypes.length === 0) {
        throw new Error('Select at least one health information type.');
      }
      if (!forAllHips && !hipId.trim()) {
        throw new Error('Enter HIP ID or select all facilities.');
      }
      if (dateFrom > dateTo) {
        throw new Error('From date cannot be after to date.');
      }
      const regNo = requesterRegNo.trim();
      if (!regNo) {
        throw new Error('Registration number is required.');
      }
      const eraseIso = new Date(dataEraseAt).toISOString();
      if (Number.isNaN(new Date(dataEraseAt).getTime())) {
        throw new Error('Invalid consent expiry.');
      }
      return startM3ConsentRequest({
        patientAbhaAddress: abhaAddress!.trim(),
        purpose,
        hiTypes,
        dateRange: toConsentDateRangeIso(dateFrom, dateTo),
        dataEraseAt: eraseIso,
        requesterName,
        requesterRegNo: regNo,
        ...(forAllHips ? {} : { hipId: hipId.trim() }),
      });
    },
    onSuccess: (res) => {
      setSessionId(res.sessionId);
      setPhase('requested');
      toast.success(
        'Consent requested. Ask the patient to approve in their ABHA / PHR app.',
      );
      void queryClient.invalidateQueries({ queryKey: ['abdm', 'm3', 'consent', res.sessionId] });
    },
    onError: (err) => toast.error(mutationErrorMessage(err)),
  });

  const fetchMutation = useMutation({
    mutationFn: () => startM3DataRequest(consentArtefactId!),
    onSuccess: (res) => {
      setTransferId(res.transferId);
      toast.message('Fetching health records from linked facilities…');
      void queryClient.invalidateQueries({ queryKey: ['abdm', 'm3', 'transfer', res.transferId] });
    },
    onError: (err) => toast.error(mutationErrorMessage(err)),
  });

  const bundleSummary = useMemo(() => {
    const bundle = transferQuery.data?.bundle;
    if (!bundle || typeof bundle !== 'object') return null;
    const entries = (bundle as { entry?: unknown[] }).entry;
    if (Array.isArray(entries)) return `${entries.length} record(s) in bundle`;
    return 'Bundle received';
  }, [transferQuery.data?.bundle]);

  const resetForm = () => {
    const range = defaultConsentDateRange();
    setPhase('form');
    setSessionId(null);
    setTransferId(null);
    setPurpose('CAREMGT');
    setDateFrom(range.from);
    setDateTo(range.to);
    setDataEraseAt(defaultDataEraseAtLocal());
    setAllHiTypes(true);
    setSelectedHiTypes(M3_HI_TYPES.map((t) => t.value));
    setForAllHips(true);
    setHipId('');
    setRequesterRegNo(DEFAULT_M3_REQUESTER_REG_NO);
  };

  const toggleHiType = (value: M3HiType, checked: boolean) => {
    setSelectedHiTypes((prev) => {
      const next = checked ? [...prev, value] : prev.filter((v) => v !== value);
      setAllHiTypes(next.length === M3_HI_TYPES.length);
      return next;
    });
  };

  if (!hasAbha) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Patient ABHA address is required to request health record consent.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 text-sm">
      <Badge variant="secondary" className="mb-3 w-fit font-normal">
        ABHA: {abhaAddress}
      </Badge>

      {readOnly ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          Consultation is read-only. ABHA consent cannot be modified.
        </p>
      ) : null}

      {phase === 'requested' && sessionId ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Consent status</span>
            <Badge variant="outline">{consentStatusLabel(consentState)}</Badge>
          </div>
          {consentQuery.data?.consentRequestId ? (
            <p className="text-xs text-muted-foreground">
              Request ID: {consentQuery.data.consentRequestId}
            </p>
          ) : null}
          {consentState === 'AWAITING_PATIENT_APPROVAL' ? (
            <p className="text-xs text-muted-foreground">
              Patient must open their PHR app → Consents → approve for your facility.
            </p>
          ) : null}
          {consentQuery.data?.error?.message ? (
            <p className="text-xs text-destructive">{consentQuery.data.error.message}</p>
          ) : null}
          {consentState === 'CONSENT_GRANTED' && consentArtefactId ? (
            <div className="space-y-2 border-t border-border pt-2">
              <p className="text-xs text-muted-foreground">
                Consent artefact: {consentArtefactId}
              </p>
              {!transferId ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={readOnly || fetchMutation.isPending}
                  onClick={() => fetchMutation.mutate()}
                >
                  {fetchMutation.isPending ? 'Starting fetch…' : 'Fetch health records'}
                </Button>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Transfer</span>
                    <Badge variant="outline">{consentStatusLabel(transferState)}</Badge>
                  </div>
                  {transferState === 'ACKNOWLEDGED' && bundleSummary ? (
                    <p className="text-xs text-teal-700">{bundleSummary}</p>
                  ) : null}
                  {transferQuery.data?.error?.message ? (
                    <p className="text-xs text-destructive">{transferQuery.data.error.message}</p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
          {!readOnly ? (
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              Request new consent
            </Button>
          ) : null}
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!readOnly) requestMutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Healthcare provider</Label>
            <Input value={requesterName} readOnly className="bg-muted/50" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="m3-reg-no">Registration number</Label>
            <Input
              id="m3-reg-no"
              value={requesterRegNo}
              disabled={readOnly}
              onChange={(e) => setRequesterRegNo(e.target.value)}
              placeholder="e.g. REG001"
            />
          </div>

          <div className="space-y-1">
            <Label>Report access duration</Label>
            <div className="flex flex-wrap gap-1">
              {M3_ACCESS_DURATION_MONTHS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly}
                  onClick={() => {
                    const range = dateRangeFromMonths(m);
                    setDateFrom(range.from);
                    setDateTo(range.to);
                  }}
                >
                  {m} mo
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="m3-from">From</Label>
              <Input
                id="m3-from"
                type="date"
                value={dateFrom}
                disabled={readOnly}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m3-to">To</Label>
              <Input
                id="m3-to"
                type="date"
                value={dateTo}
                disabled={readOnly}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Purpose</Label>
            <Select
              value={purpose}
              disabled={readOnly}
              onValueChange={(v) => setPurpose(v as M3PurposeCode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {M3_CONSENT_PURPOSES.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="m3-expiry">Consent expiry</Label>
            <Input
              id="m3-expiry"
              type="datetime-local"
              value={dataEraseAt}
              disabled={readOnly}
              onChange={(e) => setDataEraseAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="m3-all-hi"
                checked={allHiTypes}
                disabled={readOnly}
                onCheckedChange={(c) => {
                  const checked = c === true;
                  setAllHiTypes(checked);
                  setSelectedHiTypes(checked ? M3_HI_TYPES.map((t) => t.value) : []);
                }}
              />
              <Label htmlFor="m3-all-hi" className="font-normal">
                All health information types
              </Label>
            </div>
            {!allHiTypes ? (
              <div className="grid gap-1 pl-6">
                {M3_HI_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`m3-hi-${t.value}`}
                      checked={selectedHiTypes.includes(t.value)}
                      disabled={readOnly}
                      onCheckedChange={(c) => toggleHiType(t.value, c === true)}
                    />
                    <Label htmlFor={`m3-hi-${t.value}`} className="font-normal">
                      {t.label}
                    </Label>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="m3-all-hips"
                checked={forAllHips}
                disabled={readOnly}
                onCheckedChange={(c) => setForAllHips(c === true)}
              />
              <Label htmlFor="m3-all-hips" className="font-normal">
                All linked facilities (HIPs)
              </Label>
            </div>
            {!forAllHips ? (
              <Input
                placeholder="HIP ID (e.g. IN3610001625)"
                value={hipId}
                disabled={readOnly}
                onChange={(e) => setHipId(e.target.value)}
              />
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={readOnly || requestMutation.isPending}
          >
            {requestMutation.isPending ? 'Requesting…' : 'Request consent'}
          </Button>
        </form>
      )}
    </div>
  );
}
