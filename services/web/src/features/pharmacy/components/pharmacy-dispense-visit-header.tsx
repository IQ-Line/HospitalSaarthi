import { Badge } from '@pulse/ui/badge';
import {
  dispenseSaveStatusLabel,
  formatDispensePatientHeader,
  formatDispenseVisitLabel,
  pharmacyQueueStatusBadgeClass,
} from '../lib/pharmacy-queue-display';
import type { DispenseForVisitResponse } from '../types';
import { PharmacyStoreSelector } from './pharmacy-store-selector';

type PharmacyDispenseVisitHeaderProps = {
  visitId: string;
  data: DispenseForVisitResponse;
};

function encounterTypeLabel(visitStatus: string): string {
  const normalized = visitStatus.trim().toLowerCase();
  if (normalized.includes('ipd') || normalized.includes('admitted')) return 'IPD';
  if (normalized.includes('emergency') || normalized.includes('er')) return 'Emergency';
  return 'OPD';
}

function genderAgeLabel(gender: string | null, ageYears: number | null): string {
  const genderLabel =
    gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : gender === 'other' ? 'Other' : '—';
  const age = ageYears != null && ageYears > 0 ? `${ageYears}y` : '—';
  return `${genderLabel} / ${age}`;
}

export function PharmacyDispenseVisitHeader({ visitId, data }: PharmacyDispenseVisitHeaderProps) {
  const visitLabel = formatDispenseVisitLabel(visitId, data.formatted_visit_id);
  const patientName = data.patient_name?.trim() || 'Unknown patient';
  const statusLabel = dispenseSaveStatusLabel(data.dispense_status);

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Patient &amp; visit
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Patient Name
          </p>
          <p className="mt-1 text-sm font-medium">{patientName}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Gender / Age
          </p>
          <p className="mt-1 text-sm">{genderAgeLabel(data.gender, data.age_years)}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">UHID</p>
          <p className="mt-1 font-mono text-sm tabular-nums">{data.uhid?.trim() || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Visit ID
          </p>
          <p className="mt-1 font-mono text-sm tabular-nums">{visitLabel}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Encounter Type
          </p>
          <p className="mt-1 text-sm">
            {encounterTypeLabel(data.opd_prescription?.visit_status ?? 'completed')}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Store</p>
          <PharmacyStoreSelector compact />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Prescription Status
          </p>
          <Badge
            variant="outline"
            className={`mt-1 ${pharmacyQueueStatusBadgeClass(data.dispense_status)}`}
          >
            {statusLabel}
          </Badge>
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Patient summary
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDispensePatientHeader({
              patient_id: data.patient_id,
              patient_name: data.patient_name,
              uhid: data.uhid,
              age_years: data.age_years,
              gender: data.gender,
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
