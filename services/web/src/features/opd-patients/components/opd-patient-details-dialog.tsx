import { DetailViewFromConfig, WideDetailDialog } from '@/components/detail-view';
import { OPD_PATIENT_DETAILS_LAYOUT } from '../lib/opd-patient-details-sections';
import type { OpdPatientDetails } from '../types';

interface OpdPatientDetailsDialogProps {
  open: boolean;
  details: OpdPatientDetails | null;
  isLoading?: boolean;
  onClose: () => void;
}

export function OpdPatientDetailsDialog({
  open,
  details,
  isLoading,
  onClose,
}: OpdPatientDetailsDialogProps) {
  return (
    <WideDetailDialog
      open={open}
      title="Patient Details"
      onClose={onClose}
      isLoading={isLoading}
      loadingMessage="Loading patient details…"
    >
      {details ? (
        <DetailViewFromConfig config={OPD_PATIENT_DETAILS_LAYOUT} data={details} />
      ) : null}
    </WideDetailDialog>
  );
}
