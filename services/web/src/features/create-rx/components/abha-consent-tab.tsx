import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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
import { useAuthStore } from '@/stores/auth.store';
import { useCreateRxStore } from '../create-rx.store';
import {
  consentListQueryKeys,
  clearStoredConsentSession,
  fetchM3ConsentRequest,
  mapM3FsmToDisplayStatus,
  M3_HI_TYPES,
  M3_PURPOSE_OPTIONS,
  readStoredConsentSession,
  startM3ConsentRequest,
  writeStoredConsentSession,
  type M3PurposeCode,
} from '@/features/abha-consent-list/api';
import { formatConsentDate, statusBadgeClass } from '@/features/abha-consent-list/formatters';

const POLLING_STATES = new Set(['CONSENT_INIT_REQUESTED', 'AWAITING_PATIENT_APPROVAL']);

interface ConsentFormState {
  requesterName: string;
  purpose: M3PurposeCode;
  fromDate: string;
  toDate: string;
  expiryDate: string;
  forAllHips: boolean;
  hipId: string;
}

function defaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function toIsoStartOfDay(dateStr: string): string {
  const [y = 0, m = 1, d = 1] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0).toISOString();
}

function toIsoEndOfDay(dateStr: string): string {
  const [y = 0, m = 1, d = 1] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
}

function patientDisplayName(patient: {
  firstName: string;
  middleName?: string;
  lastName: string;
}): string {
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ').trim();
}

function defaultForm(requesterName: string): ConsentFormState {
  return {
    requesterName,
    purpose: 'CAREMGT',
    fromDate: defaultFromDate(),
    toDate: defaultToDate(),
    expiryDate: defaultExpiryDate(),
    forAllHips: true,
    hipId: '',
  };
}

type DisplayStatus = 'REQUESTED' | ReturnType<typeof mapM3FsmToDisplayStatus>;

function ConsentStatusPanel({
  polling,
  consentFsmState,
  displayStatus,
  detailsExpanded,
  setDetailsExpanded,
  form,
  purposeLabel,
}: {
  polling: boolean;
  consentFsmState: string | undefined;
  displayStatus: DisplayStatus;
  detailsExpanded: boolean;
  setDetailsExpanded: Dispatch<SetStateAction<boolean>>;
  form: ConsentFormState;
  purposeLabel: string;
}) {
  return (
    <div className="mb-4 rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {polling && consentFsmState != null && POLLING_STATES.has(consentFsmState) ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}
          <Badge variant="outline" className={statusBadgeClass(displayStatus)}>
            {displayStatus}
          </Badge>
          <Link
            to="/abha-consent-list"
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            View All Consents
          </Link>
        </div>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600"
          onClick={() => setDetailsExpanded((v) => !v)}
          aria-label="Toggle consent details"
        >
          {detailsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {detailsExpanded ? (
        <div className="mt-3 space-y-1 text-sm text-gray-700">
          <p>
            Date range: {formatConsentDate(toIsoStartOfDay(form.fromDate))} –{' '}
            {formatConsentDate(toIsoEndOfDay(form.toDate))}
          </p>
          <p>Consent expiry: {formatConsentDate(toIsoEndOfDay(form.expiryDate))}</p>
          <p>Healthcare provider: {form.requesterName}</p>
          <p>Purpose: {purposeLabel}</p>
          {displayStatus === 'REQUESTED' ? (
            <p className="pt-1 text-xs text-muted-foreground">
              Waiting for patient approval in the PHR app.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConsentRequestForm({
  form,
  patchForm,
  isReadOnly,
}: {
  form: ConsentFormState;
  patchForm: (patch: Partial<ConsentFormState>) => void;
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Healthcare Provider</Label>
        <Input
          value={form.requesterName}
          onChange={(e) => patchForm({ requesterName: e.target.value })}
          disabled={isReadOnly}
          className="bg-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Records from</Label>
          <Input
            type="date"
            value={form.fromDate}
            onChange={(e) => patchForm({ fromDate: e.target.value })}
            disabled={isReadOnly}
            className="bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Records to</Label>
          <Input
            type="date"
            value={form.toDate}
            onChange={(e) => patchForm({ toDate: e.target.value })}
            disabled={isReadOnly}
            className="bg-white"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Purpose</Label>
        <Select
          value={form.purpose}
          onValueChange={(v) => patchForm({ purpose: v as M3PurposeCode })}
          disabled={isReadOnly}
        >
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {M3_PURPOSE_OPTIONS.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Consent expiry</Label>
        <Input
          type="date"
          value={form.expiryDate}
          onChange={(e) => patchForm({ expiryDate: e.target.value })}
          disabled={isReadOnly}
          className="bg-white"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="all-hi-types" checked disabled />
        <Label htmlFor="all-hi-types" className="text-sm font-normal text-gray-600">
          All Health Information Types
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="all-hips"
          checked={form.forAllHips}
          onCheckedChange={(checked) => patchForm({ forAllHips: checked === true })}
          disabled={isReadOnly}
        />
        <Label htmlFor="all-hips" className="text-sm font-normal">
          For all HIPs
        </Label>
      </div>

      {!form.forAllHips ? (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">HIP ID</Label>
          <Input
            value={form.hipId}
            onChange={(e) => patchForm({ hipId: e.target.value })}
            placeholder="Enter HIP ID"
            disabled={isReadOnly}
            className="bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}

function ConsentSubmitBar({
  showStatus,
  handleRequestNew,
  handleSubmit,
  submitting,
  isFormValid,
}: {
  showStatus: boolean;
  handleRequestNew: () => void;
  handleSubmit: () => void;
  submitting: boolean;
  isFormValid: string | boolean;
}) {
  return (
    <div className="mt-4 flex justify-end">
      <Button
        type="button"
        onClick={showStatus ? handleRequestNew : handleSubmit}
        disabled={showStatus ? false : !isFormValid || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Requesting…
          </>
        ) : showStatus ? (
          'Request New Consent'
        ) : (
          'Request Consent'
        )}
      </Button>
    </div>
  );
}

export function AbhaConsentTab() {
  const queryClient = useQueryClient();
  const context = useCreateRxStore((s) => s.context);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const displayName = useAuthStore((s) => s.displayName);

  const patient = context?.patient;
  const abhaAddress = patient?.abhaAddress?.trim();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [form, setForm] = useState<ConsentFormState>(() => defaultForm(displayName ?? ''));
  const [showStatus, setShowStatus] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;
    const stored = readStoredConsentSession(patient.id);
    if (stored) {
      setSessionId(stored.sessionId);
      setForm(stored.form);
      setShowStatus(true);
    }
  }, [patient?.id]);

  useEffect(() => {
    if (displayName && !form.requesterName) {
      setForm((prev) => ({ ...prev, requesterName: displayName }));
    }
  }, [displayName, form.requesterName]);

  const { data: consentState, isLoading: polling } = useQuery({
    queryKey: ['create-rx', 'abha-consent', sessionId],
    queryFn: () => fetchM3ConsentRequest(sessionId!),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state && POLLING_STATES.has(state) ? 3000 : false;
    },
  });
  // Read the FSM state string once. Re-narrowing `consentState` at the JSX site below hits a
  // TS control-flow quirk (narrows to `never`), so use this plain value there instead.
  const consentFsmState: string | undefined = consentState?.state;

  const displayStatus = useMemo(() => {
    if (!consentState) return 'REQUESTED' as const;
    return mapM3FsmToDisplayStatus(consentState.state, consentState.error);
  }, [consentState]);

  useEffect(() => {
    if (consentState && !POLLING_STATES.has(consentState.state)) {
      void queryClient.invalidateQueries({ queryKey: consentListQueryKeys.all });
    }
  }, [consentState, queryClient]);

  if (!abhaAddress) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-gray-400">
          ABHA consent requires a linked ABHA address
        </p>
      </div>
    );
  }

  const patchForm = (patch: Partial<ConsentFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const isFormValid =
    form.requesterName.trim().length > 0 &&
    form.fromDate &&
    form.toDate &&
    form.expiryDate &&
    new Date(form.expiryDate) >= new Date(new Date().toISOString().slice(0, 10));

  const handleSubmit = async () => {
    if (!patient || !isFormValid || isReadOnly) return;
    setSubmitting(true);
    try {
      const result = await startM3ConsentRequest({
        patientAbhaAddress: abhaAddress,
        patientId: patient.id,
        patientName: patientDisplayName(patient),
        patientAbhaNumber: patient.abhaNumber,
        purpose: form.purpose,
        hiTypes: [...M3_HI_TYPES],
        dateRange: {
          from: toIsoStartOfDay(form.fromDate),
          to: toIsoEndOfDay(form.toDate),
        },
        dataEraseAt: toIsoEndOfDay(form.expiryDate),
        requesterName: form.requesterName.trim(),
        ...(form.forAllHips || !form.hipId.trim() ? {} : { hipId: form.hipId.trim() }),
      });
      writeStoredConsentSession(patient.id, {
        sessionId: result.sessionId,
        form,
      });
      setSessionId(result.sessionId);
      setShowStatus(true);
      setDetailsExpanded(true);
      void queryClient.invalidateQueries({ queryKey: consentListQueryKeys.all });
      toast.success('Consent request sent to patient PHR app');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to request consent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestNew = () => {
    if (!patient) return;
    clearStoredConsentSession(patient.id);
    setSessionId(null);
    setShowStatus(false);
    setForm(defaultForm(displayName ?? ''));
  };

  const purposeLabel =
    M3_PURPOSE_OPTIONS.find((p) => p.code === form.purpose)?.label ?? form.purpose;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-100 p-4">
      <Badge variant="outline" className="mb-4 w-fit border-teal-200 bg-teal-50 text-teal-800">
        ABHA Address: {abhaAddress}
      </Badge>

      {showStatus && sessionId ? (
        <ConsentStatusPanel
          polling={polling}
          consentFsmState={consentFsmState}
          displayStatus={displayStatus}
          detailsExpanded={detailsExpanded}
          setDetailsExpanded={setDetailsExpanded}
          form={form}
          purposeLabel={purposeLabel}
        />
      ) : null}

      {!showStatus ? (
        <ConsentRequestForm form={form} patchForm={patchForm} isReadOnly={isReadOnly} />
      ) : null}

      {!isReadOnly ? (
        <ConsentSubmitBar
          showStatus={showStatus}
          handleRequestNew={handleRequestNew}
          handleSubmit={handleSubmit}
          submitting={submitting}
          isFormValid={isFormValid}
        />
      ) : null}
    </div>
  );
}
