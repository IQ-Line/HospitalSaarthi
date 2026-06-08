import type { AdmissionDetail } from '../types';
import type { WardBeds } from '../types';
import { resolveBedLabel } from '../lib/bed-display';
import { FormSection } from '@/components/form-chrome';

type EpisodePatientContextBarProps = {
  admission: AdmissionDetail;
  wards: WardBeds[];
};

export function EpisodePatientContextBar({ admission, wards }: EpisodePatientContextBarProps) {
  const bed = resolveBedLabel(admission.bedId, wards);

  return (
    <FormSection title="Patient">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Patient name</dt>
          <dd className="text-sm font-medium">{admission.patientName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">UHID</dt>
          <dd className="text-sm font-medium tabular-nums">{admission.uhid}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Episode #</dt>
          <dd className="text-sm font-medium tabular-nums">{admission.episodeNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Bed / chair</dt>
          <dd className="text-sm font-medium">{bed}</dd>
        </div>
      </dl>
    </FormSection>
  );
}
