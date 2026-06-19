import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Skeleton } from '@pulse/ui/skeleton';
import { Textarea } from '@pulse/ui/textarea';
import { useSaveWalkInDispense, useWalkInDispense } from '../api/walk-in-dispense';
import {
  computeDispenseTotals,
  draftLinesFromSaved,
  formatDispenseDecimalInput,
  formatInrAmount,
} from '../lib/dispense-billing';
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
import { PharmacyDispenseLinesTable } from './pharmacy-dispense-lines-table';
import {
  WalkInPatientFields,
  defaultWalkInPatientDraft,
  validateWalkInPatientDraft,
} from './walk-in-patient-fields';

type PharmacyWalkInDispensePageProps = {
  recordId?: string;
};

const emptyLine = (): DispenseLineDraft => ({
  key: `new-${Date.now()}`,
  medicine_id: null,
  medicine_display_name: '',
  prescribed_quantity: '',
  quantity_dispensed: '1',
  unit_amount: '0',
  line_discount: '0',
  tax_percent: '0',
});

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
        <h1 className="text-xl font-semibold text-foreground">Walk-in dispense</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Counter sale for a patient not registered in the system
          {isEdit ? ` · Order ${recordId?.slice(0, 8).toUpperCase()}` : ''}
        </p>
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
