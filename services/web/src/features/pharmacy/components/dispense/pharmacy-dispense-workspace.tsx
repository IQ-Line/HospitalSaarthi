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
import { pharmacyQueryKeys } from '../../api/query-keys';
import {
  computeIssuedItemsBill,
  createEmptyIssuedItemRow,
  emptyDispensePatientDraft,
  patientDraftFromSearchResult,
} from '../../lib/dispense-workspace';
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

const VISIT_NONE = '__none__';

type PharmacyDispenseWorkspaceProps = {
  initialPatient?: DispensePatientSearchResult | null;
};

export function PharmacyDispenseWorkspace({
  initialPatient = null,
}: PharmacyDispenseWorkspaceProps) {
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
    enabled: Boolean(patientId),
  });

  const visitsQuery = useQuery({
    queryKey: pharmacyQueryKeys.patientVisits(patientId ?? ''),
    queryFn: () => {
      if (!patientId) return Promise.resolve([]);
      return fetchPatientVisitsMock(patientId);
    },
    enabled: Boolean(patientId),
  });

  const bill = useMemo(
    () => computeIssuedItemsBill(issuedRows, invoiceDiscount),
    [issuedRows, invoiceDiscount],
  );

  const visitOptions = useMemo(() => {
    const visits = visitsQuery.data ?? [];
    return [{ id: VISIT_NONE, label: 'Load from a visit…' }, ...visits];
  }, [visitsQuery.data]);

  const handleIssueItems = () => {
    if (bill.startedCount < 1) {
      toast.error('Add at least one medicine to issue.');
      return;
    }
    setIssuing(true);
    setTimeout(() => {
      setIssuing(false);
      toast.success('Items issued (demo). Connect pharmacy API to persist.');
    }, 600);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
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
