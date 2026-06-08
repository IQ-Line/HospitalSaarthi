import { CheckCircle2 } from 'lucide-react';
import type { OpdPrescriptionSnapshot } from '../types';
import type { PharmacyDispenseStatus } from '../types';
import {
  formatDoctorAttribution,
  formatMedicineLineTitle,
  formatMedicineSchedule,
  formatPrescriptionRelativeTime,
} from '../lib/prescription-sidebar-display';
import { pharmacyQueueStatusLabel } from '../lib/pharmacy-queue-display';

type PharmacyPrescriptionSidebarProps = {
  prescription: OpdPrescriptionSnapshot;
  dispenseStatus?: PharmacyDispenseStatus;
};

function ClinicalDetail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;

  return (
    <div className="text-sm leading-relaxed">
      <span className="font-semibold text-foreground">{label}: </span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

export function PharmacyPrescriptionSidebar({
  prescription,
  dispenseStatus = 'pending',
}: PharmacyPrescriptionSidebarProps) {
  const relativeTime = formatPrescriptionRelativeTime(prescription.finalized_at);
  const doctorLine = formatDoctorAttribution(prescription.doctor_name);
  const statusLabel = pharmacyQueueStatusLabel(dispenseStatus);
  const statusBadgeClass =
    dispenseStatus === 'partial_issue'
      ? 'border-amber-200 text-amber-800'
      : dispenseStatus === 'issued'
        ? 'border-emerald-200 text-emerald-700'
        : 'border-slate-200 text-slate-700';

  return (
    <aside className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          {relativeTime ? (
            <p className="text-xs text-muted-foreground">{relativeTime}</p>
          ) : null}
          {doctorLine ? <p className="text-sm text-foreground">{doctorLine}</p> : null}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium ${statusBadgeClass}`}>
          <CheckCircle2 className="size-3.5" aria-hidden />
          {statusLabel}
        </span>
      </div>

      <div className="space-y-3 border-b border-emerald-100 pb-4">
        <ClinicalDetail label="Vitals" value={prescription.vitals_summary} />
        <ClinicalDetail label="Complaints" value={prescription.complaints_summary} />
        <ClinicalDetail label="Diagnosis" value={prescription.diagnosis_summary} />
      </div>

      <div className="pt-4">
        <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Rx</p>

        {prescription.medicines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines on this prescription.</p>
        ) : (
          <ul className="space-y-2">
            {prescription.medicines.map((medicine) => (
              <li
                key={`${medicine.line_no}-${medicine.name}`}
                className="rounded-md border border-emerald-100 bg-white/90 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-foreground">{formatMedicineLineTitle(medicine)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatMedicineSchedule(medicine)}</p>
                {medicine.quantity ? (
                  <p className="mt-1 text-xs text-muted-foreground">Qty prescribed: {medicine.quantity}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
