import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { useCreateRxStore } from '../create-rx.store';
import { CreateRxSectionCard } from './create-rx-section-card';

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-gray-600">{label}</Label>
      <Input value={value} readOnly className="border-[#CBD5E1] bg-white" />
    </div>
  );
}

/** Reference PatientDetails embeddedMode — read-only patient snapshot. */
export function CreateRxPatientProfile() {
  const [showMore, setShowMore] = useState(false);
  const patient = useCreateRxStore((s) => s.context?.patient);
  if (!patient) return null;

  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="p-4">
      <CreateRxSectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="First Name" value={patient.firstName} />
          <Field label="Middle Name" value={patient.middleName ?? ''} />
          <Field label="Last Name" value={patient.lastName} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="UHID" value={patient.uhid} />
          <Field label="Phone Number" value={patient.phone ?? ''} />
          <Field label="ABHA Number" value={patient.abhaNumber ?? 'N/A'} />
        </div>
        <div className="mt-4">
          <Field label="ABHA Address" value={patient.abhaAddress ?? 'N/A'} />
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
            <Field label="Display Name" value={fullName} />
            <Field
              label="Gender / Age"
              value={`${patient.gender} / ${patient.age}`}
            />
          </div>
        ) : null}
      </CreateRxSectionCard>
    </div>
  );
}
