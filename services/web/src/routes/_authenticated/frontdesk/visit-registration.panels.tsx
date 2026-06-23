import { ChevronLeft, ChevronRight, RotateCcw, Save, Search } from 'lucide-react';
import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import type { UseQueryResult } from '@tanstack/react-query';
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
import type { OpdEncounterOverlay } from '@/features/opd-patients/api/opd-encounter-overlay';
import {
  effectiveOpdQueueStatus,
  queueStatusLabel,
} from '@/features/opd-patients/lib/registration-visit-status';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  RegistrationPatientSection,
  type RegistrationAbhaContext,
} from '@/features/frontdesk/components/registration-patient-section';
import { RegistrationTodayStatsSidebar } from '@/features/frontdesk/components/registration-form-chrome';
import {
  VisitRegistrationAppointmentSection,
  VisitRegistrationBillingSection,
  VisitRegistrationClinicalSections,
} from '@/features/frontdesk/components/visit-registration-sections';
import type { useVisitRegistrationSectionsStore } from '@/features/frontdesk/visit-registration-sections.store';
import type {
  CreateVisitRequestBody,
  RegistrationListItemResponse,
  RegistrationListPageResponse,
} from '@/features/frontdesk/types';

type FormValues = CreateVisitRequestBody;

type SectionVisibility = ReturnType<typeof useVisitRegistrationSectionsStore.getState>['visible'];

type RegistrationRowHandlers = {
  canCreate: boolean;
  invoiceLookupRegistrationId: string | null;
  onFollowUp: (row: RegistrationListItemResponse) => void;
  onSlipPreview: (row: RegistrationListItemResponse) => void;
  onInvoicePreview: (row: RegistrationListItemResponse) => void;
};

function RegistrationListRow({
  row,
  overlay,
  canCreate,
  invoiceLookupRegistrationId,
  onFollowUp,
  onSlipPreview,
  onInvoicePreview,
}: RegistrationRowHandlers & {
  row: RegistrationListItemResponse;
  overlay: OpdEncounterOverlay | undefined;
}) {
  const invoiceLoading = invoiceLookupRegistrationId === row.registration_id;
  const visitStatus = effectiveOpdQueueStatus(
    row.registration_status,
    overlay?.prescriptionStatus,
    overlay?.visitStatus,
  );
  const statusLabel = queueStatusLabel(visitStatus);
  return (
    <TableRow>
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

function RegistrationListTable({
  page,
  overlayMap,
  rowHandlers,
  listFetching,
  listPage,
  onListPageChange,
}: {
  page: RegistrationListPageResponse;
  overlayMap: Map<string, OpdEncounterOverlay> | undefined;
  rowHandlers: RegistrationRowHandlers;
  listFetching: boolean;
  listPage: number;
  onListPageChange: Dispatch<SetStateAction<number>>;
}) {
  return (
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
            {page.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No registrations match your search.
                </TableCell>
              </TableRow>
            ) : (
              page.data.map((row) => (
                <RegistrationListRow
                  key={row.registration_id}
                  row={row}
                  overlay={row.id ? overlayMap?.get(row.id) : undefined}
                  {...rowHandlers}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Page {page.page} of {Math.max(1, page.total_pages)} —{' '}
          {page.total} total
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listPage <= 1 || listFetching}
            onClick={() => onListPageChange((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              page.total_pages === 0 ||
              listPage >= page.total_pages ||
              listFetching
            }
            onClick={() => onListPageChange((p) => p + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function RegistrationsListPanel({
  listQuery,
  overlayMap,
  rowHandlers,
  listSearchDraft,
  onSearchChange,
  listPage,
  onListPageChange,
}: {
  listQuery: UseQueryResult<RegistrationListPageResponse>;
  overlayMap: Map<string, OpdEncounterOverlay> | undefined;
  rowHandlers: RegistrationRowHandlers;
  listSearchDraft: string;
  onSearchChange: (value: string) => void;
  listPage: number;
  onListPageChange: Dispatch<SetStateAction<number>>;
}) {
  const showListError =
    listQuery.isError &&
    !(listQuery.error instanceof ApiError && listQuery.error.status === 403);
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
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by UHID, name, or phone number"
          className="h-10 pl-9"
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Results update as you type. Newest registrations first.
      </p>

      {showListError ? (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(listQuery.error)}
        </p>
      ) : null}

      {listQuery.isFetching ? (
        <p className="text-sm text-muted-foreground">Loading registrations…</p>
      ) : null}

      {!listQuery.isFetching && listQuery.data ? (
        <RegistrationListTable
          page={listQuery.data}
          overlayMap={overlayMap}
          rowHandlers={rowHandlers}
          listFetching={listQuery.isFetching}
          listPage={listPage}
          onListPageChange={onListPageChange}
        />
      ) : null}
    </div>
  );
}

export function VisitRegistrationFormPanel({
  form,
  onSubmit,
  sectionVisible,
  abhaContext,
  abhaCardDownloading,
  onClearAbhaRegistration,
  onDownloadAbhaCard,
  onCreateAbha,
  onVerifyAbha,
  patientPhoneRef,
  patientPhoneName,
  patientPhoneOnBlur,
  patientPhoneRhfOnChange,
  tariffsLoading,
  tariffsError,
  isVisitTypeLocked,
  visitTypeHint,
  hasProvider,
  isSubmitting,
  canCreateVisit,
  createVisitBlockHint,
  onClear,
}: {
  form: UseFormReturn<FormValues>;
  onSubmit: SubmitHandler<FormValues>;
  sectionVisible: SectionVisibility;
  abhaContext: RegistrationAbhaContext | null;
  abhaCardDownloading: boolean;
  onClearAbhaRegistration: () => void;
  onDownloadAbhaCard: () => void;
  onCreateAbha: () => void;
  onVerifyAbha: () => void;
  patientPhoneRef: ComponentProps<typeof RegistrationPatientSection>['patientPhoneRef'];
  patientPhoneName: ComponentProps<typeof RegistrationPatientSection>['patientPhoneName'];
  patientPhoneOnBlur: ComponentProps<typeof RegistrationPatientSection>['patientPhoneOnBlur'];
  patientPhoneRhfOnChange: ComponentProps<
    typeof RegistrationPatientSection
  >['patientPhoneRhfOnChange'];
  tariffsLoading: boolean;
  tariffsError: boolean;
  isVisitTypeLocked: boolean;
  visitTypeHint: string | null;
  hasProvider: boolean;
  isSubmitting: boolean;
  canCreateVisit: boolean;
  createVisitBlockHint: string | undefined;
  onClear: () => void;
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 lg:mt-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <div className="min-w-0 space-y-3">
          {sectionVisible.patientDetails ? (
            <RegistrationPatientSection
              form={form}
              abhaContext={abhaContext}
              onClearAbhaRegistration={onClearAbhaRegistration}
              onDownloadAbhaCard={onDownloadAbhaCard}
              abhaCardDownloading={abhaCardDownloading}
              onCreateAbha={onCreateAbha}
              onVerifyAbha={onVerifyAbha}
              patientPhoneRef={patientPhoneRef}
              patientPhoneName={patientPhoneName}
              patientPhoneOnBlur={patientPhoneOnBlur}
              patientPhoneRhfOnChange={patientPhoneRhfOnChange}
            />
          ) : null}

          <VisitRegistrationClinicalSections
            register={form.register}
            watch={form.watch}
            setValue={form.setValue}
            visible={{
              labTests: sectionVisible.labTests,
              risAppointment: sectionVisible.risAppointment,
            }}
          />

          {sectionVisible.appointmentDetails ? (
            <VisitRegistrationAppointmentSection
              register={form.register}
              watch={form.watch}
              setValue={form.setValue}
              tariffsLoading={tariffsLoading}
              tariffsError={tariffsError}
              isVisitTypeLocked={isVisitTypeLocked}
              visitTypeHint={visitTypeHint}
            />
          ) : null}

          {sectionVisible.billing ? (
            <VisitRegistrationBillingSection
              register={form.register}
              watch={form.watch}
              setValue={form.setValue}
              paymentModeError={form.formState.errors.billing?.payment_mode?.message}
              amountPaidError={form.formState.errors.billing?.amount_paid?.message}
              variant="detailed"
              tariffsLoading={tariffsLoading}
              tariffsError={tariffsError}
              hasProvider={hasProvider}
            />
          ) : null}

          <footer className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !canCreateVisit}
              title={createVisitBlockHint ?? undefined}
              className="h-10 gap-2 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              <Save className="size-4" />
              {isSubmitting ? 'Saving…' : 'Create Visit'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 px-6"
              onClick={onClear}
              disabled={isSubmitting}
            >
              <RotateCcw className="size-4" />
              Clear
            </Button>
          </footer>
          {createVisitBlockHint ? (
            <p className="text-right text-xs text-destructive" role="status">
              {createVisitBlockHint}
            </p>
          ) : null}
        </div>

        <RegistrationTodayStatsSidebar />
      </div>
    </form>
  );
}
