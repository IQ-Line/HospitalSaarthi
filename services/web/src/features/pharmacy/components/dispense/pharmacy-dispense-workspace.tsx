import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TwoColumnLayout } from '@pulse/layouts/two-column-layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { toast } from 'sonner';
import {
  fetchPatientPrescriptionsMock,
  fetchPatientVisitsMock,
} from '../../api/pharmacy-ui-mock';
import { issueManualDispenseStock } from '../../api/manual-dispense-issue';
import { pharmacyQueryKeys } from '../../api/query-keys';
import {
  computeIssuedItemsBill,
  createEmptyIssuedItemRow,
  emptyDispensePatientDraft,
  isIssuedRowStarted,
  patientDraftFromSearchResult,
} from '../../lib/dispense-workspace';
import { useSelectedPharmacyStoreId } from '../../store';
import type {
  DispensePatientDraft,
  DispensePatientSearchResult,
  DispensePaymentDraft,
} from '../../types/dispense-ui.types';
import { DispenseBillingBar } from './dispense-billing-bar';
import { DispenseIssuedItemsTable } from './dispense-issued-items-table';
import { DispensePageFooter } from './dispense-page-footer';
import { DispensePatientFields } from './dispense-patient-fields';
import { DispensePrescriptionSidebar } from './dispense-prescription-sidebar';

export type { DispensePatientSearchResult };

const VISIT_NONE = '__none__';

type PharmacyDispenseWorkspaceProps = {
  initialPatient?: DispensePatientSearchResult | null;
  /** Walk-in = registered patient without a queued prescription. */
  mode?: 'opd' | 'walk_in';
};

export function PharmacyDispenseWorkspace({
  initialPatient = null,
  mode = 'walk_in',
}: PharmacyDispenseWorkspaceProps) {
  const isWalkIn = mode === 'walk_in';
  const selectedStoreId = useSelectedPharmacyStoreId();
  const [patient, setPatient] = useState<DispensePatientDraft>(() =>
    initialPatient ? patientDraftFromSearchResult(initialPatient) : emptyDispensePatientDraft(),
  );
  const [issuedRows, setIssuedRows] = useState(() => [createEmptyIssuedItemRow()]);
  const [linkedVisitId, setLinkedVisitId] = useState<string | undefined>(undefined);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [payment, setPayment] = useState<DispensePaymentDraft>({
    payment_mode: '',
    amount_paid: '',
  });
  const [issuing, setIssuing] = useState(false);

  const patientId = patient.patient_id;

  const prescriptionsQuery = useQuery({
    queryKey: pharmacyQueryKeys.patientPrescriptions(patientId ?? ''),
    queryFn: () => {
      if (!patientId) return Promise.resolve([]);
      return fetchPatientPrescriptionsMock(patientId);
    },
    enabled: Boolean(patientId) && !isWalkIn,
  });

  const visitsQuery = useQuery({
    queryKey: pharmacyQueryKeys.patientVisits(patientId ?? ''),
    queryFn: () => {
      if (!patientId) return Promise.resolve([]);
      return fetchPatientVisitsMock(patientId);
    },
    enabled: Boolean(patientId) && !isWalkIn,
  });

  const bill = useMemo(
    () => computeIssuedItemsBill(issuedRows, invoiceDiscount),
    [issuedRows, invoiceDiscount],
  );

  const visitOptions = useMemo(() => {
    const visits = visitsQuery.data ?? [];
    return [{ id: VISIT_NONE, label: 'Load from a visit…' }, ...visits];
  }, [visitsQuery.data]);

  const handleIssueItems = async () => {
    if (bill.startedCount < 1) {
      toast.error('Add at least one medicine to issue.');
      return;
    }
    if (!selectedStoreId?.trim()) {
      toast.error('Select a pharmacy store before issuing medicines.');
      return;
    }

    const lines = issuedRows
      .filter((row) => isIssuedRowStarted(row) && row.medicine_id)
      .map((row) => ({
        inventory_item_id: row.medicine_id!,
        quantity: row.quantity.trim(),
      }));

    if (lines.length === 0) {
      toast.error('Select issued items from store stock before issuing.');
      return;
    }

    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error('Each issued line needs a quantity greater than zero.');
        return;
      }
    }

    setIssuing(true);
    try {
      await issueManualDispenseStock({
        inventory_store_id: selectedStoreId,
        lines,
      });
      toast.success(
        isWalkIn
          ? 'Walk-in items issued — store stock updated.'
          : 'Items issued — store stock updated.',
      );
      setIssuedRows([createEmptyIssuedItemRow()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue items.');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isWalkIn && initialPatient ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Walk-in dispense — no prescription in the pharmacy queue for this patient.
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        {isWalkIn ? (
          <div className="h-full overflow-y-auto pr-1">
            <div className="flex flex-col gap-6 pb-4">
              <DispensePatientFields
                value={patient}
                onChange={(patch) => setPatient((prev) => ({ ...prev, ...patch }))}
                disabled={issuing}
              />

              <div className="flex flex-col gap-3">
                <h2 className="shrink-0 text-base font-semibold">Issued Items</h2>
                <DispenseIssuedItemsTable
                  rows={issuedRows}
                  onChange={setIssuedRows}
                  disabled={issuing}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">Billing</h2>
                <DispenseBillingBar
                  subtotal={bill.subtotal}
                  lineDiscountTotal={bill.lineDiscountTotal}
                  lineTaxTotal={bill.lineTaxTotal}
                  invoiceDiscount={bill.invoiceDiscount}
                  onInvoiceDiscountChange={setInvoiceDiscount}
                  total={bill.total}
                  payment={payment}
                  onPaymentChange={setPayment}
                  disabled={issuing}
                />
              </div>
            </div>
          </div>
        ) : (
          <TwoColumnLayout
            className="h-full"
            defaultLeftWidth={68}
            defaultRightWidth={32}
            minLeftWidth={45}
            minRightWidth={25}
            left={
              <div className="flex flex-col gap-6">
                <DispensePatientFields
                  value={patient}
                  onChange={(patch) => setPatient((prev) => ({ ...prev, ...patch }))}
                  disabled={issuing}
                />

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="shrink-0 text-base font-semibold">Issued Items</h2>
                    <Select
                      value={linkedVisitId ?? VISIT_NONE}
                      disabled={!patientId || issuing}
                      onValueChange={(v) =>
                        setLinkedVisitId(v === VISIT_NONE ? undefined : v)
                      }
                    >
                      <SelectTrigger className="h-9 w-full max-w-[240px] min-w-[10rem]">
                        <SelectValue placeholder="Load from a visit…" />
                      </SelectTrigger>
                      <SelectContent>
                        {visitOptions.map((visit) => (
                          <SelectItem key={visit.id} value={visit.id}>
                            {visit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DispenseIssuedItemsTable
                    rows={issuedRows}
                    onChange={setIssuedRows}
                    disabled={issuing}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">Billing</h2>
                  <DispenseBillingBar
                    subtotal={bill.subtotal}
                    lineDiscountTotal={bill.lineDiscountTotal}
                    lineTaxTotal={bill.lineTaxTotal}
                    invoiceDiscount={bill.invoiceDiscount}
                    onInvoiceDiscountChange={setInvoiceDiscount}
                    total={bill.total}
                    payment={payment}
                    onPaymentChange={setPayment}
                    disabled={issuing}
                  />
                </div>
              </div>
            }
            right={
              <DispensePrescriptionSidebar
                cards={prescriptionsQuery.data ?? []}
                isLoading={prescriptionsQuery.isLoading}
              />
            }
          />
        )}
      </div>

      <DispensePageFooter
        pendingAmount={bill.total}
        itemCount={bill.startedCount}
        issuing={issuing}
        onIssueItems={handleIssueItems}
      />
    </div>
  );
}
