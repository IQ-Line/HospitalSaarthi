import { Pencil } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { ProfileDetailRow } from '@/features/abha/components/abha-wizard-ui';
import type { AbhaProfileDisplay } from '@/features/abha/types';

export function AbhaWizardProfileStep({
  profileDisplay,
  isSubmitting,
  onEditAddress,
}: {
  profileDisplay: AbhaProfileDisplay;
  isSubmitting: boolean;
  onEditAddress: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-foreground">Patient Details</p>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">ABHA Number/ आभा संख्या</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {profileDisplay.abhaNumber || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">ABHA Address/ आभा पता</p>
            <p className="mt-1 break-all text-lg font-semibold tracking-tight text-foreground">
              {profileDisplay.abhaAddress || '—'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            className="shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onEditAddress}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="space-y-2.5 rounded-lg bg-sky-50/80 p-4 text-sm">
        <ProfileDetailRow label="Patient Name" value={profileDisplay.patientName} />
        <ProfileDetailRow label="Gender" value={profileDisplay.gender} />
        <ProfileDetailRow label="Date of Birth" value={profileDisplay.dateOfBirth} />
        <ProfileDetailRow label="Mobile Number" value={profileDisplay.mobile} />
        <ProfileDetailRow label="Address" value={profileDisplay.address} />
      </div>
    </div>
  );
}
