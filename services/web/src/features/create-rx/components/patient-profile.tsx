import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { DetailViewField } from '@/components/detail-view';
import { useCreateRxStore } from '../create-rx.store';
import { SectionCard } from './section-card';

export function CreateRxPatientProfile() {
  const [showMore, setShowMore] = useState(false);
  const patient = useCreateRxStore((s) => s.context?.patient);
  if (!patient) return null;

  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="p-4">
      <SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DetailViewField label="First Name" value={patient.firstName} />
          <DetailViewField label="Middle Name" value={patient.middleName ?? ''} />
          <DetailViewField label="Last Name" value={patient.lastName} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <DetailViewField label="UHID" value={patient.uhid} />
          <DetailViewField label="Phone Number" value={patient.phone ?? ''} />
          <DetailViewField
            label="ABHA Number"
            value={patient.abhaNumber ?? 'N/A'}
            highlight={Boolean(patient.abhaNumber)}
          />
        </div>
        <div className="mt-4">
          <DetailViewField
            label="ABHA Address"
            value={patient.abhaAddress ?? 'N/A'}
            highlight={Boolean(patient.abhaAddress)}
          />
        </div>
        <button
          type="button"
          className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          onClick={() => setShowMore((v) => !v)}
        >
          <ChevronDown className={`size-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          {showMore ? 'Show Less' : 'Show More Details'}
        </button>
        {showMore ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailViewField label="Display Name" value={fullName} />
            <DetailViewField
              label="Gender / Age"
              value={`${patient.gender} / ${patient.age}`}
            />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
