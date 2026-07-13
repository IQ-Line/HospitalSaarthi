import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Skeleton } from '@pulse/ui/skeleton';
import { Textarea } from '@pulse/ui/textarea';
import { useSaveWalkInDispense, useWalkInDispense } from '../api/walk-in-dispense';
import { findOpenQueueVisitForPatient } from '../api/search-dispense-patients';
import {
  computeDispenseTotals,
  draftLinesFromSaved,
  formatDispenseDecimalInput,
  formatInrAmount,
} from '../lib/dispense-billing';
import { createEmptyDispenseLineDraft } from '../lib/dispense-line-draft';
import {
  buildSaveDispenseLinesFromDraft,
  firstDispenseValidationMessage,
  validateDispenseDraft,
  type DispenseLineFieldErrors,
} from '../lib/validate-dispense-draft';
import {
  saveWalkInPatientInputFromDraft,
  walkInPatientDraftFromRecord,
} from '../lib/walk-in-patient-map';
import type { DispenseLineDraft, WalkInPatientDraft } from '../types';
import type { DispensePatientSearchResult } from '../types/dispense-ui.types';
import { PharmacyDispenseLinesTable } from './pharmacy-dispense-lines-table';
import { DispensePatientSearch } from './dispense/dispense-patient-search';
import {
  WalkInPatientFields,
  defaultWalkInPatientDraft,
  validateWalkInPatientDraft,
} from './walk-in-patient-fields';

type PharmacyWalkInDispensePageProps = {
  recordId?: string;
};

const emptyLine = createEmptyDispenseLineDraft;

export function PharmacyWalkInDispensePage({ recordId }: PharmacyWalkInDispensePageProps) {
  const navigate = useNavigate();
  const isEdit = Boolean(recordId?.trim());
  const { data, isLoading, isError, error } = useWalkInDispense(recordId);
  const saveMutation = useSaveWalkInDispense(recordId);

  const [patient, setPatient] = useState<WalkInPatientDraft>(defaultWalkInPatientDraft());
  const [patientErrors, setPatientErrors] = useState<
    Partial<Record<keyof WalkInPatientDraft, string>>
  >({});
  const [lines, setLines] = useState<DispenseLineDraft[]>([emptyLine()]);
  const [lineErrors, setLineErrors] = useState<Record<string, DispenseLineFieldErrors>>({});
  const [discountError, setDiscountError] = useState<string | undefined>();
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(!isEdit);
  const [patientSearch, setPatientSearch] = useState('');
  const [resolvingPatient, setResolvingPatient] = useState(false);

  useEffect(() => {
    if (!isEdit || !data || initialized) return;

    setPatient(walkInPatientDraftFromRecord(data.walk_in_patient));
    setLines(
      data.lines.length > 0
        ? draftLinesFromSaved(data.lines)
        : [emptyLine()],
    );
    setDiscount(formatDispenseDecimalInput(data.discount) || '0');
    setNotes(data.notes ?? '');
    setInitialized(true);
  }, [data, initialized, isEdit]);

  const totals = useMemo(() => computeDispenseTotals(lines, discount), [lines, discount]);

  const handleRegisteredPatientSelect = (selected: DispensePatientSearchResult) => {
    setResolvingPatient(true);
    setPatientSearch(`${selected.first_name} ${selected.last_name}`.trim() || selected.uhid);
    void findOpenQueueVisitForPatient(selected)
      .then((queueVisit) => {
        if (queueVisit?.visit_id) {
          toast.message('Prescription found — opening OPD dispense.');
          void navigate({
            to: '/pharmacy/visits/$visitId',
            params: { visitId: queueVisit.visit_id },
          });
          return;
        }

        const gender =
          selected.gender === 'male' || selected.gender === 'female' || selected.gender === 'other'
            ? selected.gender
            : '';
        setPatient({
          first_name: selected.first_name,
          last_name: selected.last_name,
          phone: selected.phone.replace(/\D/g, '').slice(-10),
          gender,
          date_of_birth: selected.date_of_birth,
        });
        toast.message('No prescription in queue — continuing as walk-in.');
      })
      .catch(() => {
        toast.error('Unable to resolve patient for dispense.');
      })
      .finally(() => setResolvingPatient(false));
  };

  const handlePatientChange = (patch: Partial<WalkInPatientDraft>) => {
    setPatient((prev) => ({ ...prev, ...patch }));
    setPatientErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as Array<keyof WalkInPatientDraft>) {
        delete next[key];
      }
      return next;
    });
  };

  const handleLinesChange = (nextLines: DispenseLineDraft[]) => {
    setLines(nextLines);
    setLineErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const key of Object.keys(prev)) {
        if (!nextLines.some((line) => line.key === key)) {
          delete next[key];
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    const nextPatientErrors = validateWalkInPatientDraft(patient);
    setPatientErrors(nextPatientErrors);
    if (Object.keys(nextPatientErrors).length > 0) {
      toast.error('Complete required patient fields.');
      return;
    }

    const validation = validateDispenseDraft(lines, discount);
    setLineErrors(validation.lineErrors);
    setDiscountError(validation.discountError);
    if (!validation.isValid) {
      toast.error(firstDispenseValidationMessage(validation));
      return;
    }

    const payloadLines = buildSaveDispenseLinesFromDraft(lines);

    try {
      const saved = await saveMutation.mutateAsync({
        walk_in_patient: saveWalkInPatientInputFromDraft(patient),
        discount: discount.trim() || '0',
        notes: notes.trim() || null,
        lines: payloadLines,
      });
      toast.success('Walk-in dispense saved.');
      setLineErrors({});
      setDiscountError(undefined);
      if (!isEdit) {
        await navigate({
          to: '/pharmacy/walk-in-orders/$recordId',
          params: { recordId: saved.record_id },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save walk-in dispense.');
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isEdit && (isError || !data)) {
    return (
      <div className="p-4">
        <Link to="/pharmacy/queue" className="mb-4 inline-flex items-center gap-2 text-sm text-[#2563EB]">
          <ArrowLeft className="size-4" />
          Back to queue
        </Link>
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Unable to load walk-in dispense order.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-24 pt-4 md:px-4">
      <div className="mb-4">
        <Link
          to="/pharmacy/queue"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Prescription Queue
        </Link>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Walk-in dispense</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search a registered patient, or enter details manually
              {isEdit ? ` · Order ${recordId?.slice(0, 8).toUpperCase()}` : ''}
            </p>
          </div>
          {!isEdit ? (
            <div className="w-full min-w-0 sm:w-[min(100%,320px)]">
              <DispensePatientSearch
                value={patientSearch}
                onValueChange={setPatientSearch}
                onPatientSelect={handleRegisteredPatientSelect}
                disabled={saveMutation.isPending || resolvingPatient}
                placeholder="Search by name, UHID, phone…"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Patient details
          </h2>
          <WalkInPatientFields
            value={patient}
            onChange={handlePatientChange}
            disabled={saveMutation.isPending}
            errors={patientErrors}
          />
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Dispense lines
          </h2>
          <PharmacyDispenseLinesTable
            lines={lines}
            onChange={handleLinesChange}
            disabled={saveMutation.isPending}
            lineErrors={lineErrors}
          />

          <div className="mt-6 grid max-w-md gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Bill discount (₹)</span>
              <Input
                value={discount}
                disabled={saveMutation.isPending}
                aria-invalid={Boolean(discountError)}
                onChange={(event) => {
                  setDiscount(event.target.value);
                  setDiscountError(undefined);
                }}
              />
              {discountError ? <p className="text-sm text-destructive">{discountError}</p> : null}
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <Textarea
                value={notes}
                disabled={saveMutation.isPending}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Subtotal</p>
              <p className="font-semibold tabular-nums">{formatInrAmount(totals.subtotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Discount</p>
              <p className="font-semibold tabular-nums">{formatInrAmount(totals.discount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatInrAmount(totals.total_amount)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {formatInrAmount(totals.total_amount)} · {lines.length} line{lines.length === 1 ? '' : 's'}
            {isEdit ? ' · Saved' : ' · Unsaved'}
          </p>
          <Button
            type="button"
            className="min-w-[160px]"
            disabled={saveMutation.isPending}
            onClick={() => void handleSave()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save dispense'}
          </Button>
        </div>
      </div>
    </div>
  );
}
