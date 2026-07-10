import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { toast } from 'sonner';
import {
  consentListQueryKeys,
  downloadM3Attachment,
  fetchConsentArtefactRecords,
  type ConsentArtefactRecordsResponse,
  type ConsentListArtifact,
  type ConsentListDataPushedEntry,
  type ConsentListSession,
} from './api';
import {
  capitalize,
  extractPeriodStart,
  formatPeriodRange,
  formatRecordDate,
  formatRecordDay,
  generateRecordCaption,
  recordDisplayType,
  transformFhirBundleForView,
  type TransformedBundleView,
} from './fhir-bundle-view';

const PAGE_SIZE = 5;

export interface ConsentHealthRecord {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  careContextReference?: string;
  content: string;
  entryData?: ConsentListDataPushedEntry;
  viewData: TransformedBundleView;
  identifiers?: ConsentListSession['identifiers'];
  createdAt?: string;
  sessionId?: string;
}

interface ViewDocumentsDialogProps {
  session: ConsentListSession | null;
  artifact?: ConsentListArtifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function entryTitle(entry: ConsentListDataPushedEntry, view: TransformedBundleView): string {
  return recordDisplayType(entry, view);
}

export function recordsFromArtifact(
  artifact: ConsentListArtifact,
  session: ConsentListSession,
): ConsentHealthRecord[] {
  const entries = artifact.dataPushed?.entries ?? [];
  return entries.map((entry, index) => {
    const viewData = transformFhirBundleForView(entry.content, entry);
    return {
      id: entry.id || entry.careContextReference || `${artifact.consentId}-${index}`,
      type: entryTitle(entry, viewData),
      source: artifact.hipName ?? artifact.hipId,
      timestamp: session.grantedAt ?? session.updatedAt,
      careContextReference: entry.careContextReference,
      content: entry.content,
      entryData: entry,
      viewData,
      identifiers: session.identifiers,
      createdAt: session.grantedAt ?? session.updatedAt,
      sessionId: session.sessionId,
    };
  });
}

export function recordsFromSession(session: ConsentListSession): ConsentHealthRecord[] {
  return session.consentArtifacts.reduce<ConsentHealthRecord[]>((all, artifact) => {
    return [...all, ...recordsFromArtifact(artifact, session)];
  }, []);
}

function recordsFromFetchedArtefacts(
  session: ConsentListSession,
  fetched: ConsentArtefactRecordsResponse,
  artifact?: ConsentListArtifact | null,
): ConsentHealthRecord[] {
  const items = artifact
    ? fetched.artefacts.filter((item) => item.consentId === artifact.consentId)
    : fetched.artefacts;

  return items.flatMap((item) => {
    const meta = session.consentArtifacts.find((a) => a.consentId === item.consentId);
    const merged: ConsentListArtifact = {
      consentId: item.consentId,
      hipId: item.hipId,
      hipName: item.hipName ?? meta?.hipName,
      status: meta?.status ?? 'GRANTED',
      hiTypes: meta?.hiTypes ?? session.hiTypes,
      careContexts: meta?.careContexts ?? [],
      ...(item.dataPushed ? { dataPushed: item.dataPushed } : {}),
    };
    return recordsFromArtifact(merged, session);
  });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-gray-600">
      <span className="font-medium text-gray-700">{label}:</span> {value}
    </p>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4 w-full rounded-md border border-gray-200 p-4 shadow-xs">
      <h4 className="mb-2 text-sm font-semibold text-gray-800">{title}</h4>
      {children}
    </div>
  );
}

type CompositionInfo = NonNullable<TransformedBundleView['CompositionInfo']>[number];
type PractitionerInfo = NonNullable<TransformedBundleView['PractitionerInfo']>[number];

function computeVisitDate(view: TransformedBundleView) {
  const encounter = view.EncounterInfo?.[0];
  if (!encounter) return null;
  if (encounter.period) return extractPeriodStart(encounter.period);
  return null;
}

function computePeriod(view: TransformedBundleView) {
  return view.EncounterInfo?.[0]?.period
    ? formatPeriodRange(view.EncounterInfo[0].period)
    : { from: 'N/A', until: 'N/A' };
}

function computeCustodian(composition: CompositionInfo | undefined, fallback: string): string {
  return composition?.custodian &&
    typeof composition.custodian === 'object' &&
    typeof (composition.custodian as { display?: string }).display === 'string'
    ? (composition.custodian as { display: string }).display
    : fallback;
}

function practitionerIdLabel(practitioner: PractitionerInfo | undefined): string {
  const practitionerId = practitioner?.identifier;
  return Array.isArray(practitionerId) && practitionerId[0]
    ? `${typeof practitionerId[0].type === 'string' ? practitionerId[0].type : ''}${practitionerId[0].type ? '- ' : ''}${practitionerId[0].value ?? 'N/A'}`
    : 'N/A';
}

async function viewAttachment(
  attachment: NonNullable<ConsentListDataPushedEntry['AttachmentRefs']>[number],
  sessionId: string | undefined,
  recordSessionId: string | undefined,
  setLoadingAttachment: (value: string | null) => void,
) {
  const sid = attachment.sessionId || sessionId || recordSessionId;
  if (!sid) return;
  const key = `${attachment.bundleId}-${attachment.num}`;
  setLoadingAttachment(key);
  try {
    await downloadM3Attachment(sid, attachment.bundleId, attachment.num);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to load attachment');
  } finally {
    setLoadingAttachment(null);
  }
}

function RecordInfoCard({ view, record, sessionId }: { view: TransformedBundleView; record: ConsentHealthRecord; sessionId?: string }) {
  const [loadingAttachment, setLoadingAttachment] = useState<string | null>(null);
  const attachments = view.AttachmentRefs ?? record.entryData?.AttachmentRefs ?? [];
  const visitDate = computeVisitDate(view);
  const composition = view.CompositionInfo?.[0];
  const custodian = computeCustodian(composition, record.source);

  return (
    <SectionCard title="Record Information">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField label="Visit Date" value={visitDate ? formatRecordDate(String(visitDate)) : 'N/A'} />
        <DetailField
          label="Fetched Date"
          value={record.createdAt ? formatRecordDate(record.createdAt) : 'N/A'}
        />
        <DetailField label="Custodian" value={custodian || 'N/A'} />
        <DetailField
          label="Status"
          value={composition?.status ? capitalize(String(composition.status)) : 'N/A'}
        />
      </div>
      {attachments.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-600">Attachment</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const key = `${attachment.bundleId}-${attachment.num}`;
              return (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  className="h-6 bg-teal-600 text-xs hover:bg-teal-700"
                  disabled={loadingAttachment === key}
                  onClick={(e) => {
                    e.stopPropagation();
                    void viewAttachment(attachment, sessionId, record.sessionId, setLoadingAttachment);
                  }}
                >
                  {loadingAttachment === key ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : null}
                  View Report
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

function PatientInfoCard({ view, record }: { view: TransformedBundleView; record: ConsentHealthRecord }) {
  const patient = view.PatientInfo?.[0];
  return (
    <SectionCard title="Subject (Patient Info)">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField label="Name" value={String(patient?.name ?? 'N/A')} />
        <DetailField label="Gender" value={capitalize(patient?.gender)} />
        <DetailField
          label="Telecom"
          value={
            Array.isArray(patient?.telecom) && patient.telecom[0]
              ? String(patient.telecom[0])
              : 'N/A'
          }
        />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField
          label="Identifier"
          value={
            Array.isArray(patient?.identifier) && patient.identifier[0]?.value
              ? String(patient.identifier[0].value)
              : 'N/A'
          }
        />
        <DetailField
          label="Date of Birth"
          value={
            patient?.birthDate ? formatRecordDay(String(patient.birthDate)) : 'N/A'
          }
        />
        <DetailField
          label="ABHA Address"
          value={record.identifiers?.abha_address ?? 'N/A'}
        />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField label="ABHA Number" value={record.identifiers?.abha_number ?? 'N/A'} />
      </div>
    </SectionCard>
  );
}

function PractitionerInfoCard({ view }: { view: TransformedBundleView }) {
  const practitioner = view.PractitionerInfo?.[0];
  const practitionerIdValue = practitionerIdLabel(practitioner);
  return (
    <SectionCard title="Author (Practitioner Info)">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField label="Name" value={String(practitioner?.name ?? 'N/A')} />
        <DetailField label="Identifier" value={practitionerIdValue} />
        <DetailField
          label="Qualification"
          value={String(practitioner?.qualification ?? 'N/A')}
        />
      </div>
    </SectionCard>
  );
}

function EncounterInfoCard({ view }: { view: TransformedBundleView }) {
  const encounter = view.EncounterInfo?.[0];
  const period = computePeriod(view);
  return (
    <SectionCard title="Encounter Info">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField label="Encounter Type" value={String(encounter?.type ?? 'N/A')} />
        <DetailField label="Status" value={capitalize(encounter?.status)} />
        <DetailField label="Period" value={`${period.from} to ${period.until}`} />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailField label="Class" value={capitalize(encounter?.class)} />
        <DetailField
          label="Identifier"
          value={
            Array.isArray(encounter?.identifier) && encounter.identifier[0]?.value
              ? String(encounter.identifier[0].value)
              : 'N/A'
          }
        />
      </div>
    </SectionCard>
  );
}

function RecordDetails({ record, sessionId }: { record: ConsentHealthRecord; sessionId?: string }) {
  const view = record.viewData;
  return (
    <div className="mt-4 border-t border-gray-200 pt-4" onClick={(e) => e.stopPropagation()}>
      <RecordInfoCard view={view} record={record} sessionId={sessionId} />
      <PatientInfoCard view={view} record={record} />
      <PractitionerInfoCard view={view} />
      <EncounterInfoCard view={view} />
    </div>
  );
}

function RecordsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
          (p, i, arr) => p >= 1 && p <= totalPages && arr.indexOf(p) === i,
        );

  return (
    <div className="flex items-center justify-center gap-1 rounded-md bg-gray-50 p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pages.map((page) => (
        <Button
          key={page}
          type="button"
          variant="ghost"
          size="sm"
          className={`size-8 min-w-8 p-0 ${currentPage === page ? 'bg-white font-semibold text-gray-800 shadow-sm' : 'text-gray-600'}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function ViewDocumentsList({ records, sessionId }: { records: ConsentHealthRecord[]; sessionId?: string }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const displayRecords = records.slice(start, start + PAGE_SIZE);

  const toggleRecord = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="flex flex-col">
      <div className="space-y-6 pb-4">
        {displayRecords.map((record, index) => {
          const rowKey = `${record.id}-${index}`;
          const expanded = expandedKey === rowKey;
          return (
            <div
              key={rowKey}
              className="cursor-pointer rounded-md border border-gray-200 p-4 shadow-xs transition-colors hover:bg-gray-50"
              onClick={() => toggleRecord(rowKey)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-800">{record.type}</h3>
                    <Badge className="max-w-full truncate bg-blue-600 text-xs text-white hover:bg-blue-600">
                      {record.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">ID: {record.id}</p>
                  <p className="text-sm font-medium text-gray-600">
                    {generateRecordCaption(record.viewData)}
                  </p>
                </div>
                <ChevronDown
                  className={`mt-1 size-4 shrink-0 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </div>
              {expanded ? <RecordDetails record={record} sessionId={sessionId} /> : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 py-3">
        <RecordsPagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

export function ViewDocumentsDialog({
  session,
  artifact,
  open,
  onOpenChange,
}: ViewDocumentsDialogProps) {
  const sessionId = session?.sessionId;
  const consentId = artifact?.consentId;
  const listKey = session ? `${session.sessionId}-${consentId ?? 'all'}` : 'empty';

  const { data, isLoading, isError } = useQuery({
    queryKey: consentListQueryKeys.records(sessionId ?? '', consentId),
    queryFn: () => fetchConsentArtefactRecords(sessionId!, consentId),
    enabled: open && !!session && session.status === 'GRANTED',
  });

  const records =
    session && data ? recordsFromFetchedArtefacts(session, data, artifact) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-gray-800">
            Consent Records Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load health records. Please try again.
            </p>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No records available yet. Ensure the consultation was ended (FHIR bundle saved) and
              refresh this list. If consent was just granted, wait for HIP data push or refresh again.
            </p>
          ) : (
            <ViewDocumentsList
              key={listKey}
              records={records}
              sessionId={session!.sessionId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
