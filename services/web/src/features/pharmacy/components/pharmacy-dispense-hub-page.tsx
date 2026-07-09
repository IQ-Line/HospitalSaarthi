import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { DEMO_PATIENT_SEARCH_RESULTS } from '../data/pharmacy-demo-data';
import { PharmacyPageShell } from './pharmacy-page-shell';
import { DispensePatientSearch } from './dispense/dispense-patient-search';
import { PharmacyDispenseWorkspace } from './dispense/pharmacy-dispense-workspace';
import type { DispensePatientSearchResult } from '../types/dispense-ui.types';

export function PharmacyDispensePage() {
  const search = useSearch({ from: '/_authenticated/pharmacy/dispense/' });
  const [headerSearch, setHeaderSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DispensePatientSearchResult | null>(
    null,
  );

  useEffect(() => {
    const patientId = search.patientId?.trim();
    if (!patientId) return;
    const found = DEMO_PATIENT_SEARCH_RESULTS.find((p) => p.id === patientId);
    if (found) {
      setSelectedPatient(found);
      setHeaderSearch(`${found.first_name} ${found.last_name}`.trim());
    }
  }, [search.patientId]);

  const handlePatientSelect = (patient: DispensePatientSearchResult) => {
    setSelectedPatient(patient);
    setHeaderSearch(`${patient.first_name} ${patient.last_name}`.trim());
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
          />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-0">
        <PharmacyDispenseWorkspace
          key={selectedPatient?.id ?? 'walk-in'}
          initialPatient={selectedPatient}
        />
      </div>
    </PharmacyPageShell>
  );
}

/** Dispensing hub — empty state with patient search (image 4). */
export function PharmacyDispensingHubPage() {
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState('');

  const handlePatientSelect = (patient: DispensePatientSearchResult) => {
    void navigate({
      to: '/pharmacy/dispense',
      search: { patientId: patient.id },
    });
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
          Use patient search in the header — by name, UHID, MRN, or phone — to open the patient
          chart and dispensing workspace.
        </p>
      </section>
    </PharmacyPageShell>
  );
}
