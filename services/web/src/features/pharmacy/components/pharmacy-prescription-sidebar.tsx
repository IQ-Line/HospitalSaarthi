import type { OpdPrescriptionMedicineLine } from '../types';

type PharmacyPrescriptionSidebarProps = {
  medicines: OpdPrescriptionMedicineLine[];
};

function formatMedicineMeta(medicine: OpdPrescriptionMedicineLine): string {
  const parts = [medicine.dosage, medicine.frequency, medicine.duration]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' · ');
  return parts || '—';
}

export function PharmacyPrescriptionSidebar({ medicines }: PharmacyPrescriptionSidebarProps) {
  return (
    <aside className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Patient&apos;s prescription</h2>
        <span className="text-xs text-muted-foreground">{medicines.length} medicine(s)</span>
      </div>

      {medicines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medicines on this prescription.</p>
      ) : (
        <ul className="space-y-3">
          {medicines.map((medicine) => (
            <li
              key={`${medicine.line_no}-${medicine.name}`}
              className="rounded-md border border-emerald-100 bg-white/80 px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">
                {medicine.name}
                {medicine.strength ? ` (${medicine.strength})` : ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{formatMedicineMeta(medicine)}</p>
              {medicine.quantity ? (
                <p className="mt-1 text-xs text-muted-foreground">Qty prescribed: {medicine.quantity}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
