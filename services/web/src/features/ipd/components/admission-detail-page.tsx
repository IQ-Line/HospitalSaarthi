import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FileText,
  LogOut,
  Pencil,
  Pill,
  Receipt,
  StickyNote,
} from 'lucide-react';
import { PageTabs } from '@pulse/blocks/page-tabs';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Skeleton } from '@pulse/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import { cn } from '@pulse/utils';
import { fetchAdmissionById, fetchWardBeds } from '../api/admissions';
import { ipdQueryKeys } from '../api/query-keys';
import { resolveWardAndBed } from '../lib/bed-display';
import {
  admissionSourceLabel,
  admissionStatusBadgeClass,
  admissionStatusLabel,
  admissionTypeLabel,
  financialClassLabel,
  formatEnumLabel,
} from '../lib/display';
import type { AdmissionDetail } from '../types';
import { ClinicalNotePanel } from './clinical-note-panel';
import { NonRoutineExitPanel } from './non-routine-exit-panel';
import { OrderTrackerPanel } from './order-tracker-panel';
import { VitalsChartPanel } from './vitals-chart-panel';

type EpisodeModuleTab =
  | 'summary'
  | 'notes'
  | 'vitals'
  | 'medications'
  | 'orders'
  | 'billing'
  | 'discharge'
  | 'exit';
type SummaryContentTab =
  | 'overview'
  | 'notes'
  | 'orders'
  | 'vitals'
  | 'io'
  | 'medications'
  | 'consults'
  | 'charges'
  | 'timeline'
  | 'discharge';
type ShiftFilter = 'all' | 'this_shift' | 'last_shift' | 'last_24h';

const EPISODE_MODULE_TABS: { id: EpisodeModuleTab; label: string; icon: typeof FileText }[] = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'discharge', label: 'Discharge', icon: LogOut },
  { id: 'exit', label: 'Exit', icon: AlertTriangle },
];

const SUMMARY_CONTENT_TABS: { value: SummaryContentTab; label: string; badge?: number }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'notes', label: 'Notes', badge: 0 },
  { value: 'orders', label: 'Orders', badge: 0 },
  { value: 'vitals', label: 'Vitals' },
  { value: 'io', label: 'I/O' },
  { value: 'medications', label: 'Medications' },
  { value: 'consults', label: 'Consults' },
  { value: 'charges', label: 'Charges' },
  { value: 'timeline', label: 'Timeline', badge: 1 },
  { value: 'discharge', label: 'Discharge' },
];

const SHIFT_FILTERS: { value: ShiftFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'this_shift', label: 'This Shift' },
  { value: 'last_shift', label: 'Last Shift' },
  { value: 'last_24h', label: 'Last 24h' },
];

type AdmissionDetailPageProps = {
  admissionId: string;
};

export function AdmissionDetailPage({ admissionId }: AdmissionDetailPageProps) {
  const [moduleTab, setModuleTab] = useState<EpisodeModuleTab>('summary');
  const [contentTab, setContentTab] = useState<SummaryContentTab>('overview');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');

  const { data: admission, isLoading, isError } = useQuery({
    queryKey: ipdQueryKeys.admissionDetail(admissionId),
    queryFn: () => fetchAdmissionById(admissionId),
  });

  const { data: wards = [] } = useQuery({
    queryKey: ipdQueryKeys.wards(),
    queryFn: fetchWardBeds,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !admission) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Admission not found</h2>
        <Button asChild variant="outline">
          <Link to="/ipd/admissions">Back to queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <EpisodeModuleNav
        admission={admission}
        activeTab={moduleTab}
        onTabChange={setModuleTab}
      />

      {moduleTab === 'notes' ? (
        <ClinicalNotePanel admission={admission} onBack={() => setModuleTab('summary')} />
      ) : moduleTab === 'vitals' ? (
        <VitalsChartPanel admission={admission} onBack={() => setModuleTab('summary')} />
      ) : moduleTab === 'orders' ? (
        <OrderTrackerPanel admission={admission} />
      ) : moduleTab === 'exit' ? (
        <NonRoutineExitPanel admission={admission} onBack={() => setModuleTab('summary')} />
      ) : (
        <>
          <EpisodeHeader admission={admission} />

          <PatientSummaryBar admission={admission} wards={wards} />

          <div className="flex-1 space-y-4 bg-muted/30 px-4 py-4 md:px-6">
            {moduleTab === 'summary' ? (
              <>
                <ShiftFilterBar value={shiftFilter} onChange={setShiftFilter} />

                <div className="overflow-hidden rounded-lg border bg-card">
                  <PageTabs
                    tabs={SUMMARY_CONTENT_TABS.map((tab) => ({
                      value: tab.value,
                      label: tab.label,
                      badge: tab.badge,
                    }))}
                    value={contentTab}
                    onValueChange={(v) => setContentTab(v as SummaryContentTab)}
                  />

                  <div className="p-4 md:p-6">
                    {contentTab === 'overview' ? (
                      <OverviewPanel admission={admission} />
                    ) : (
                      <PlaceholderPanel tab={contentTab} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <PlaceholderPanel tab={moduleTab} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EpisodeModuleNav({
  admission,
  activeTab,
  onTabChange,
}: {
  admission: AdmissionDetail;
  activeTab: EpisodeModuleTab;
  onTabChange: (tab: EpisodeModuleTab) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2 md:px-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{admission.episodeNumber}</span>
        {' — '}
        {admission.patientName}
        {' /'}
      </p>

      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as EpisodeModuleTab)}
        className="w-auto"
      >
        <TabsList className="h-auto flex-wrap justify-end gap-1 bg-transparent p-0">
          {EPISODE_MODULE_TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className={cn(
                'gap-1.5 rounded-md px-2.5 py-1.5 text-xs shadow-none after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground md:text-sm',
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

function EpisodeHeader({ admission }: { admission: AdmissionDetail }) {
  const canEdit = admission.status === 'scheduled';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
        Episode: {admission.episodeNumber}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            admissionStatusBadgeClass(admission.status),
          )}
        >
          {admissionStatusLabel(admission.status)}
        </span>

        {canEdit ? (
          <Button type="button" size="sm">
            Assign Bed
          </Button>
        ) : null}

        {canEdit ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/ipd/admissions/$admissionId/edit" params={{ admissionId: admission.id }}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>
        ) : null}

        {canEdit ? (
          <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
            Cancel
          </Button>
        ) : null}

        <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
          <Link to="/ipd/admissions">
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PatientSummaryBar({
  admission,
  wards,
}: {
  admission: AdmissionDetail;
  wards: Parameters<typeof resolveWardAndBed>[1];
}) {
  const { ward, bed } = resolveWardAndBed(admission.bedId, wards);

  const fields = [
    { label: 'Patient', value: admission.patientName },
    { label: 'UHID', value: admission.uhid || '—' },
    { label: 'Age / Gender', value: '— / —' },
    { label: 'Ward / Bed', value: `${ward} / ${bed}` },
    { label: 'Consultant', value: admission.consultant ? formatEnumLabel(admission.consultant) : '—' },
    { label: 'Specialty', value: admission.specialty ? formatEnumLabel(admission.specialty) : '—' },
  ];

  return (
    <div className="border-b bg-card px-4 py-4 md:px-6">
      <div className="grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShiftFilterBar({
  value,
  onChange,
}: {
  value: ShiftFilter;
  onChange: (value: ShiftFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Show:</span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as ShiftFilter);
        }}
        className="flex flex-wrap gap-1"
      >
        {SHIFT_FILTERS.map(({ value: filterValue, label }) => (
          <ToggleGroupItem
            key={filterValue}
            value={filterValue}
            className="h-8 rounded-full px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function OverviewPanel({ admission }: { admission: AdmissionDetail }) {
  const detailFields = [
    { label: 'Admission Type', value: admissionTypeLabel(admission.type) },
    { label: 'Source', value: admissionSourceLabel(admission.admissionSource) },
    { label: 'Admitted', value: '—' },
    {
      label: 'Expected LOS',
      value: admission.expectedLosDays != null ? `${admission.expectedLosDays} days` : '—',
    },
    { label: 'Actual LOS', value: '—' },
    { label: 'Financial Class', value: financialClassLabel(admission.financialClass) },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Admission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            {detailFields.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t pt-4">
            <dt className="text-xs text-muted-foreground">Provisional Diagnosis</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {admission.provisionalDiagnosis || '—'}
            </dd>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flags &amp; Financial</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <dt className="text-xs text-muted-foreground">Admission Flags</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {admission.flags.length > 0 ? (
                admission.flags.map((flag) => (
                  <Badge key={flag} variant="secondary">
                    {flag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm font-medium">None</span>
              )}
            </dd>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderPanel({ tab }: { tab: string }) {
  const label = tab.replace(/_/g, ' ');
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-sm text-muted-foreground">
      {label.charAt(0).toUpperCase() + label.slice(1)} content will be wired in a later pass.
    </div>
  );
}
