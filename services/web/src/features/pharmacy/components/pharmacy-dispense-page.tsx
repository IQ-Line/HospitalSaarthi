import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Skeleton } from '@pulse/ui/skeleton';
import { Textarea } from '@pulse/ui/textarea';
import { useDispenseForVisit, useSaveDispenseForVisit } from '../api/dispense-order';
import {
  computeDispenseTotals,
  draftLinesFromVisitDispense,
  formatDispenseDecimalInput,
  formatInrAmount,
} from '../lib/dispense-billing';
import { createEmptyDispenseLineDraft } from '../lib/dispense-line-draft';
import { dispenseSaveStatusLabel } from '../lib/pharmacy-queue-display';
import {
  buildSaveDispenseLinesFromDraft,
  firstDispenseValidationMessage,
  validateDispenseDraft,
  type DispenseLineFieldErrors,
} from '../lib/validate-dispense-draft';
import type { DispenseLineDraft } from '../types';
import { PharmacyDispenseLinesTable } from './pharmacy-dispense-lines-table';
import { PharmacyDispenseVisitHeader } from './pharmacy-dispense-visit-header';
import { PharmacyPrescriptionSidebar } from './pharmacy-prescription-sidebar';

type PharmacyDispensePageProps = {
  visitId: string;
};

export function PharmacyDispensePage({ visitId }: PharmacyDispensePageProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useDispenseForVisit(visitId);
  const saveMutation = useSaveDispenseForVisit(visitId);

  const [lines, setLines] = useState<DispenseLineDraft[]>([]);
  const [lineErrors, setLineErrors] = useState<Record<string, DispenseLineFieldErrors>>({});
  const [discountError, setDiscountError] = useState<string | undefined>();
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!data || initialized) return;

    const seeded = draftLinesFromVisitDispense(data);
    setLines(seeded.length > 0 ? seeded : [createEmptyDispenseLineDraft()]);

    setDiscount(formatDispenseDecimalInput(data.discount) || '0');
    setNotes(data.notes ?? '');
    setInitialized(true);
  }, [data, initialized]);

  const totals = useMemo(() => computeDispenseTotals(lines, discount), [lines, discount]);
  const isFullyDispensed = data?.dispense_status === 'issued';
  const isReadOnly = isFullyDispensed || saveMutation.isPending;

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

  const handleIssue = async () => {
    if (!data?.patient_id) return;

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
        patient_id: data.patient_id,
        opd_prescription_id: data.opd_prescription_id ?? data.opd_prescription?.prescription_id ?? null,
        discount: discount.trim() || '0',
        notes: notes.trim() || null,
        lines: payloadLines,
      });
      if (saved.dispense_status === 'issued') {
        toast.success('Medicines dispensed. This prescription is now closed.');
      } else {
        toast.success('Partial issue saved. Complete remaining items when stock is available.');
      }
      setLineErrors({});
      setDiscountError(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue medicines.');
    }
  };

  const handleCancel = () => {
    void navigate({ to: '/pharmacy/queue' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.opd_prescription) {
    return (
      <div className="p-4">
        <Link to="/pharmacy/queue" className="mb-4 inline-flex items-center gap-2 text-sm text-[#2563EB]">
          <ArrowLeft className="size-4" />
          Back to queue
        </Link>
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Unable to load dispense order for this visit.'}
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

      <div className="mb-6">
        <h1 className="mb-4 text-xl font-semibold text-foreground">Prescription dispensing</h1>
        <PharmacyDispenseVisitHeader visitId={visitId} data={data} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg bg-white p-4 shadow-sm">
          {isFullyDispensed ? (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              This prescription is fully dispensed. The issue form is read-only — use Returns if you need to
              reverse stock.
            </div>
          ) : null}
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Items to issue
          </h2>
          <PharmacyDispenseLinesTable
            lines={lines}
            onChange={handleLinesChange}
            disabled={isReadOnly}
            lineErrors={lineErrors}
            fullyDispensed={isFullyDispensed}
          />

          <div className="mt-6 grid max-w-md gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Bill discount (₹)</span>
              <Input
                value={discount}
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
              <p className="text-lg font-semibold tabular-nums">{formatInrAmount(totals.total_amount)}</p>
            </div>
          </div>
        </section>

        <PharmacyPrescriptionSidebar
          prescription={data.opd_prescription}
          dispenseStatus={data.dispense_status}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {formatInrAmount(totals.total_amount)} · {lines.length} line{lines.length === 1 ? '' : 's'}
            {' · '}
            {dispenseSaveStatusLabel(data.dispense_status)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={handleCancel}
            >
              {isFullyDispensed ? 'Back to queue' : 'Cancel'}
            </Button>
            {!isFullyDispensed ? (
              <Button
                type="button"
                className="min-w-[140px]"
                disabled={saveMutation.isPending}
                onClick={() => void handleIssue()}
              >
                {saveMutation.isPending ? 'Issuing…' : 'Issue Items'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
