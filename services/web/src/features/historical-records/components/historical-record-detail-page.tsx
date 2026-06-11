import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { cn } from '@pulse/utils';
import { fetchEmpiPatientDetail, empiPatientAgeYears } from '@/features/opd-patients/api/empi-patients';
import { HISTORICAL_RECORDS_STALE_MS } from '../api/constants';
import { fetchHistoricalPatientProfile } from '../api/historical-records';
import { historicalRecordsQueryKeys } from '../api/query-keys';
import { HistoricalDocumentsTab } from './historical-documents-tab';
import { HistoricalReportsTab } from './historical-reports-tab';
import { PatientProfileTab } from './patient-profile-tab';
import type { HistoricalDetailTab } from '../types';

interface HistoricalRecordDetailPageProps {
  patientId: string;
  activeTab: HistoricalDetailTab;
  onTabChange: (tab: HistoricalDetailTab) => void;
}

const TABS: Array<{ id: HistoricalDetailTab; label: string }> = [
  { id: 'profile', label: 'Patient Profile' },
  { id: 'documents', label: 'Documents' },
  { id: 'reports', label: 'Reports' },
];

export function HistoricalRecordDetailPage({
  patientId,
  activeTab,
  onTabChange,
}: HistoricalRecordDetailPageProps) {
  const { data: empiDetail, isLoading: empiLoading } = useQuery({
    queryKey: ['empi', 'patient', patientId],
    queryFn: () => fetchEmpiPatientDetail(patientId),
    enabled: Boolean(patientId),
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: historicalRecordsQueryKeys.patientProfile(patientId),
    queryFn: () => fetchHistoricalPatientProfile(patientId),
    enabled: Boolean(patientId),
    staleTime: HISTORICAL_RECORDS_STALE_MS,
  });

  const isLoading = empiLoading || profileLoading;
  const patient = empiDetail?.patient;
  const age = patient ? empiPatientAgeYears(patient) : 0;
  const genderLabel = patient?.gender ?? 'unknown';
  const headerTitle = patient
    ? `${patient.first_name || patient.full_name} (${genderLabel}, ${age}) - UHID:${patient.uhid}`
    : 'Patient Record';

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-6 pt-4 md:px-4">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/historical-records" className="text-[#2563EB] hover:underline">
          Historical Records
        </Link>
        <span>/</span>
        <span>Patient</span>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900 md:text-2xl">{headerTitle}</h1>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'border-b-2 pb-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {activeTab === 'profile' && profile ? <PatientProfileTab profile={profile} /> : null}
          {activeTab === 'documents' ? <HistoricalDocumentsTab patientId={patientId} /> : null}
          {activeTab === 'reports' ? <HistoricalReportsTab patientId={patientId} /> : null}
        </>
      )}
    </div>
  );
}
