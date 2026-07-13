import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  fetchDispensePatientById,
  findOpenQueueVisitForPatient,
} from '../api/search-dispense-patients';
import { PharmacyPageShell } from './pharmacy-page-shell';
import { DispensePatientSearch } from './dispense/dispense-patient-search';
import {
  PharmacyDispenseWorkspace,
  type DispensePatientSearchResult,
} from './dispense/pharmacy-dispense-workspace';

async function resolvePatientForDispense(
  patient: DispensePatientSearchResult,
): Promise<{ kind: 'opd'; visitId: string } | { kind: 'walk_in'; patient: DispensePatientSearchResult }> {
  const queueVisit = await findOpenQueueVisitForPatient(patient);
  if (queueVisit?.visit_id) {
    return { kind: 'opd', visitId: queueVisit.visit_id };
  }
  return { kind: 'walk_in', patient };
}

export function PharmacyDispensePage() {
  const search = useSearch({ from: '/_authenticated/pharmacy/dispense/' });
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DispensePatientSearchResult | null>(
    null,
  );
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const patientId = search.patientId?.trim();
    if (!patientId) return;

    let cancelled = false;
    void (async () => {
      setResolving(true);
      try {
        const found = await fetchDispensePatientById(patientId);
        if (cancelled || !found) return;

        const resolved = await resolvePatientForDispense(found);
        if (cancelled) return;

        if (resolved.kind === 'opd') {
          void navigate({
            to: '/pharmacy/visits/$visitId',
            params: { visitId: resolved.visitId },
          });
          return;
        }

        setSelectedPatient(resolved.patient);
        setHeaderSearch(
          `${resolved.patient.first_name} ${resolved.patient.last_name}`.trim() ||
            resolved.patient.uhid,
        );
      } catch {
        if (!cancelled) {
          toast.error('Unable to load patient for dispense.');
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, search.patientId]);

  const handlePatientSelect = (patient: DispensePatientSearchResult) => {
    setResolving(true);
    void resolvePatientForDispense(patient)
      .then((resolved) => {
        if (resolved.kind === 'opd') {
          toast.message('Prescription found — opening dispense.');
          void navigate({
            to: '/pharmacy/visits/$visitId',
            params: { visitId: resolved.visitId },
          });
          return;
        }

        setSelectedPatient(resolved.patient);
        setHeaderSearch(
          `${resolved.patient.first_name} ${resolved.patient.last_name}`.trim() ||
            resolved.patient.uhid,
        );
        toast.message('No prescription in queue — opening walk-in dispense.');
      })
      .catch(() => {
        toast.error('Unable to open dispense for this patient.');
      })
      .finally(() => setResolving(false));
  };

  return (
    <PharmacyPageShell
      title="Dispense"
      breadcrumbLabel="Dispense"
      fullHeight
      actions={
        <div className="w-full min-w-0 sm:w-[min(100%,360px)]">
          <DispensePatientSearch
            value={headerSearch}
            onValueChange={setHeaderSearch}
            onPatientSelect={handlePatientSelect}
            disabled={resolving}
            placeholder="Search by name, UHID, phone, or ABHA…"
          />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-0">
        {selectedPatient ? (
          <PharmacyDispenseWorkspace
            key={selectedPatient.id}
            initialPatient={selectedPatient}
            mode="walk_in"
          />
        ) : (
          <section
            className="mx-6 mb-6 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-16 text-center"
            aria-live="polite"
          >
            <p className="text-base font-semibold text-foreground">
              {resolving ? 'Loading patient…' : 'Search for a patient to dispense'}
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Search by name, UHID, phone, or ABHA. Patients with a prescription in the pharmacy
              queue open OPD dispense; others open as walk-in.
            </p>
          </section>
        )}
      </div>
    </PharmacyPageShell>
  );
}

/** Dispensing hub — empty state with patient search (image 4). */
export function PharmacyDispensingHubPage() {
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState('');
  const [resolving, setResolving] = useState(false);

  const handlePatientSelect = (patient: DispensePatientSearchResult) => {
    setResolving(true);
    void resolvePatientForDispense(patient)
      .then((resolved) => {
        if (resolved.kind === 'opd') {
          void navigate({
            to: '/pharmacy/visits/$visitId',
            params: { visitId: resolved.visitId },
          });
          return;
        }
        void navigate({
          to: '/pharmacy/dispense',
          search: { patientId: patient.id },
        });
      })
      .catch(() => {
        toast.error('Unable to open dispense for this patient.');
      })
      .finally(() => setResolving(false));
  };

  return (
    <PharmacyPageShell
      title="Dispensing"
      description="Search for a patient to dispense medicines"
      breadcrumbLabel="Dispensing"
      actions={
        <div className="w-full min-w-0 sm:w-[min(100%,280px)]">
          <DispensePatientSearch
            value={headerSearch}
            onValueChange={setHeaderSearch}
            onPatientSelect={handlePatientSelect}
            disabled={resolving}
            placeholder="Search patient by name, UHID, MRN…"
          />
        </div>
      }
    >
      <section
        className="mx-6 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-16 text-center"
        aria-live="polite"
      >
        <p className="text-base font-semibold text-foreground">Select a patient to dispense</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Use patient search in the header — by name, UHID, phone, or ABHA. With a queued
          prescription you open OPD dispense; otherwise walk-in.
        </p>
      </section>
    </PharmacyPageShell>
  );
}
