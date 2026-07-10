import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { fetchOpdRegistrationDeskList } from '@/features/frontdesk/api/opd-registration-list';
import { fetchOpdEncounterOverlaysByVisitIds } from '@/features/opd-patients/api/opd-encounter-overlay';
import type { RegistrationReportQueryContext } from '@/features/frontdesk/api/registration-documents';
import { resolveRegistrationBillId } from '@/features/frontdesk/api/registration-bill';
import {
  RegistrationReportsModal,
  type RegistrationReportView,
} from '@/components/registration-reports-modal';
import type { OpdRegistrationFollowUpState } from '@/features/frontdesk/lib/apply-follow-up-prefill';
import type {
  RegistrationListItemResponse,
  RegistrationListPageResponse,
} from '@/features/frontdesk/types';
import {
  effectiveOpdQueueStatus,
  queueStatusLabel,
} from '@/features/opd-patients/lib/registration-visit-status';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { useTenantStore } from '@/stores/tenant.store';

type ReportsModalConfig = {
  registrationId: string;
  reportContext: RegistrationReportQueryContext;
  singleView?: RegistrationReportView;
  footerMode: 'registration' | 'list';
};

type OverlayByVisitId = Awaited<ReturnType<typeof fetchOpdEncounterOverlaysByVisitIds>>;

function RegistrationResultsPanel({
  listQuery,
  listSearch,
  listSearchDraft,
  setListSearchDraft,
  listPage,
  setListPage,
  canCreate,
  invoiceLookupRegistrationId,
  overlayData,
  onFollowUp,
  onSlipPreview,
  onInvoicePreview,
}: {
  listQuery: UseQueryResult<RegistrationListPageResponse>;
  listSearch: string;
  listSearchDraft: string;
  setListSearchDraft: (value: string) => void;
  listPage: number;
  setListPage: Dispatch<SetStateAction<number>>;
  canCreate: boolean;
  invoiceLookupRegistrationId: string | null;
  overlayData: OverlayByVisitId | undefined;
  onFollowUp: (row: RegistrationListItemResponse) => void;
  onSlipPreview: (row: RegistrationListItemResponse) => void;
  onInvoicePreview: (row: RegistrationListItemResponse) => void;
}) {
  return (
    <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-4 md:p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Registrations
      </h2>
      <div className="relative max-w-xl">
        <Label htmlFor="reg-list-search" className="sr-only">
          Search registrations
        </Label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="reg-list-search"
          value={listSearchDraft}
          onChange={(e) => setListSearchDraft(e.target.value)}
          placeholder="Search by UHID, name, or phone number"
          className="h-10 pl-9"
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Results update as you type. Newest registrations first.
      </p>

      {listQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(listQuery.error)}
        </p>
      ) : null}

      {listQuery.isFetching ? (
        <p className="text-sm text-muted-foreground">Loading registrations…</p>
      ) : null}

      {!listQuery.isFetching && listQuery.data ? (
        <>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UHID</TableHead>
                  <TableHead>Visit ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visit type</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {listSearch
                        ? 'No registrations match your search.'
                        : 'No registrations yet. Create one with + New registration.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  listQuery.data.data.map((row) => (
                    <RegistrationTableRow
                      key={row.registration_id}
                      row={row}
                      canCreate={canCreate}
                      invoiceLoading={invoiceLookupRegistrationId === row.registration_id}
                      overlayData={overlayData}
                      onFollowUp={onFollowUp}
                      onSlipPreview={onSlipPreview}
                      onInvoicePreview={onInvoicePreview}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {listQuery.data.page} of {Math.max(1, listQuery.data.total_pages)} —{' '}
              {listQuery.data.total} total
            </span>
            <RegistrationListPagination
              page={listPage}
              totalPages={listQuery.data.total_pages}
              isFetching={listQuery.isFetching}
              onPrev={() => setListPage((p) => Math.max(1, p - 1))}
              onNext={() => setListPage((p) => p + 1)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function RegistrationListPagination({
  page,
  totalPages,
  isFetching,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1 || isFetching}
        onClick={onPrev}
        className="gap-1"
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={totalPages === 0 || page >= totalPages || isFetching}
        onClick={onNext}
        className="gap-1"
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function RegistrationTableRow({
  row,
  canCreate,
  invoiceLoading,
  overlayData,
  onFollowUp,
  onSlipPreview,
  onInvoicePreview,
}: {
  row: RegistrationListItemResponse;
  canCreate: boolean;
  invoiceLoading: boolean;
  overlayData: OverlayByVisitId | undefined;
  onFollowUp: (row: RegistrationListItemResponse) => void;
  onSlipPreview: (row: RegistrationListItemResponse) => void;
  onInvoicePreview: (row: RegistrationListItemResponse) => void;
}) {
  const overlay = row.id ? overlayData?.get(row.id) : undefined;
  const visitStatus = effectiveOpdQueueStatus(
    row.registration_status,
    overlay?.prescriptionStatus,
    overlay?.visitStatus,
  );
  const statusLabel = queueStatusLabel(visitStatus);
  return (
    <TableRow key={row.registration_id}>
      <TableCell className="font-medium tabular-nums">
        {row.patient_uhid ?? '—'}
      </TableCell>
      <TableCell className="font-medium tabular-nums">
        {row.visit_id ?? '—'}
      </TableCell>
      <TableCell>{row.patient_full_name ?? '—'}</TableCell>
      <TableCell className="tabular-nums">{row.patient_phone_number ?? '—'}</TableCell>
      <TableCell>{statusLabel}</TableCell>
      <TableCell>{row.visit_type_label ?? row.visit_type ?? '—'}</TableCell>
      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
        {new Date(row.created_at).toLocaleString()}
      </TableCell>
      <TableCell className="relative text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {canCreate ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              title="Open follow-up visit for this patient"
              onClick={() => onFollowUp(row)}
            >
              Follow-up
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Preview OPD slip"
            onClick={() => onSlipPreview(row)}
          >
            OPD Slip
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={invoiceLoading}
            title="Preview invoice"
            onClick={() => void onInvoicePreview(row)}
          >
            {invoiceLoading ? 'Loading…' : 'Invoice'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function OpdRegistrationListPage() {
  const navigate = useNavigate();
  const { canCreate, canRead, canMutate } = useCatalogModuleCrud('registration', {
    productModuleSlug: 'frontdesk',
  });
  const listViewable = canRead || canMutate;
  const tenantName = useTenantStore((s) => s.tenantName);
  const branches = useTenantStore((s) => s.branches);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const branchName =
    branches.find((b) => b.id === activeBranch)?.name ?? 'Main branch';
  const branchLabel = [tenantName, branchName].filter(Boolean).join(' — ') || 'Noida — Main Branch';

  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [reportsModal, setReportsModal] = useState<ReportsModalConfig | null>(null);
  const [invoiceLookupRegistrationId, setInvoiceLookupRegistrationId] = useState<string | null>(
    null,
  );
  const [listSearchDraft, setListSearchDraft] = useState('');
  const listSearch = useDebouncedValue(listSearchDraft.trim(), 300);
  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    setListPage(1);
  }, [listSearch]);

  const listQuery = useQuery({
    queryKey: ['registrations', 'list', listPage, listSearch],
    queryFn: () =>
      fetchOpdRegistrationDeskList({
        page: listPage,
        limit: 10,
        q: listSearch || undefined,
      }),
    enabled: listViewable,
  });

  const listVisitIds = useMemo(
    () =>
      (listQuery.data?.data ?? [])
        .map((row) => row.id?.trim())
        .filter((id): id is string => Boolean(id)),
    [listQuery.data?.data],
  );

  const encounterOverlayQuery = useQuery({
    queryKey: ['registrations', 'encounter-overlay', listVisitIds],
    queryFn: () => fetchOpdEncounterOverlaysByVisitIds(listVisitIds),
    enabled: listVisitIds.length > 0,
    retry: false,
    staleTime: 30_000,
  });

  const openSlipPreview = (row: RegistrationListItemResponse) => {
    setReportsModal({
      registrationId: row.registration_id,
      reportContext: { facility_name: branchLabel },
      singleView: 'slip',
      footerMode: 'list',
    });
    setReportsModalOpen(true);
  };

  const openFollowUpVisit = (row: RegistrationListItemResponse) => {
    void navigate({
      to: '/frontdesk/create-opd-registration',
      state: { followUpFrom: row } satisfies OpdRegistrationFollowUpState,
    });
  };

  const openInvoicePreview = async (row: RegistrationListItemResponse) => {
    setInvoiceLookupRegistrationId(row.registration_id);
    try {
      const billId = await resolveRegistrationBillId(row.registration_id, row.id);
      if (!billId) {
        toast.error('No invoice found for this registration.');
        return;
      }
      setReportsModal({
        registrationId: row.registration_id,
        reportContext: { bill_id: billId, facility_name: branchLabel },
        singleView: 'receipt',
        footerMode: 'list',
      });
      setReportsModalOpen(true);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setInvoiceLookupRegistrationId(null);
    }
  };

  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">OPD Registration</h1>
          {canCreate ? (
            <Button type="button" size="sm" asChild>
              <Link to="/frontdesk/create-opd-registration">+ New registration</Link>
            </Button>
          ) : null}
        </header>

        {listViewable ? (
          <RegistrationResultsPanel
            listQuery={listQuery}
            listSearch={listSearch}
            listSearchDraft={listSearchDraft}
            setListSearchDraft={setListSearchDraft}
            listPage={listPage}
            setListPage={setListPage}
            canCreate={canCreate}
            invoiceLookupRegistrationId={invoiceLookupRegistrationId}
            overlayData={encounterOverlayQuery.data}
            onFollowUp={openFollowUpVisit}
            onSlipPreview={openSlipPreview}
            onInvoicePreview={openInvoicePreview}
          />
        ) : null}
      </div>

      {reportsModal ? (
        <RegistrationReportsModal
          open={reportsModalOpen}
          onOpenChange={(open) => {
            setReportsModalOpen(open);
            if (!open) setReportsModal(null);
          }}
          registrationId={reportsModal.registrationId}
          reportContext={reportsModal.reportContext}
          singleView={reportsModal.singleView}
          footerMode={reportsModal.footerMode}
        />
      ) : null}
    </div>
  );
}
