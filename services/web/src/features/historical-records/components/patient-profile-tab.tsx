import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@pulse/ui/button';
import type { HistoricalPatientProfile } from '../types';

interface PatientProfileTabProps {
  profile: HistoricalPatientProfile;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

export function PatientProfileTab({ profile }: PatientProfileTabProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ProfileField label="First Name" value={profile.firstName} />
        <ProfileField label="Middle Name" value={profile.middleName} />
        <ProfileField label="Last Name" value={profile.lastName} />
        <ProfileField label="UHID" value={profile.uhid} />
        <ProfileField label="Phone Number" value={profile.phoneNumber} />
        <ProfileField label="ABHA Number" value={profile.abhaNumber} />
        <ProfileField label="ABHA Address" value={profile.abhaAddress} />
      </div>

      {expanded ? (
        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 md:grid-cols-3">
          <ProfileField label="Date of Birth" value={profile.dateOfBirth} />
          <ProfileField label="Age" value={profile.ageDisplay} />
          <ProfileField label="Gender" value={profile.gender} />
          <ProfileField label="Street Address" value={profile.streetAddress} />
          <ProfileField label="District" value={profile.district} />
          <ProfileField label="State" value={profile.state} />
          <ProfileField label="PIN Code" value={profile.pinCode} />
          <ProfileField label="Visit Count" value={String(profile.visitCount)} />
          <ProfileField label="Last Updated" value={profile.lastUpdated} />
        </div>
      ) : null}

      <div className="mt-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 px-0 text-[#2563EB] hover:bg-transparent hover:text-[#1D4ED8]"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show Less' : 'Show More'}
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
