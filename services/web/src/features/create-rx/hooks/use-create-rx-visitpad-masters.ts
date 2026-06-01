import { useMemo } from 'react';
import {
  useVisitpadAllergens,
  useVisitpadAllergyReactions,
  useVisitpadChiefComplaints,
  useVisitpadChronicIllnesses,
  useVisitpadDiagnoses,
  useVisitpadManufacturers,
  useVisitpadMedicines,
  useVisitpadVaccines,
  VISITPAD_CATALOG_FORM_PAGE,
} from '@/features/visitpad/api';
import type { VisitpadMedicine } from '@/features/visitpad/types';
import {
  activeVisitpadCatalogRows,
  visitpadDiagnosisOptions,
  visitpadDisplayNameOptions,
  visitpadMedicineOptions,
  type VisitpadSelectOption,
} from '../lib/visitpad-catalog-options';

const FORM_PAGE = VISITPAD_CATALOG_FORM_PAGE;

export function useCreateRxVisitpadMasters(): {
  isLoading: boolean;
  isError: boolean;
  vaccineOptions: VisitpadSelectOption[];
  manufacturerOptions: VisitpadSelectOption[];
  allergenOptions: VisitpadSelectOption[];
  allergyReactionOptions: VisitpadSelectOption[];
  diagnosisOptions: VisitpadSelectOption[];
  medicineOptions: VisitpadSelectOption[];
  chronicIllnessOptions: VisitpadSelectOption[];
  chiefComplaintOptions: VisitpadSelectOption[];
  medicines: VisitpadMedicine[];
} {
  const vaccinesQ = useVisitpadVaccines(undefined, FORM_PAGE);
  const manufacturersQ = useVisitpadManufacturers(undefined, FORM_PAGE);
  const allergensQ = useVisitpadAllergens(undefined, undefined, FORM_PAGE);
  const reactionsQ = useVisitpadAllergyReactions(undefined, FORM_PAGE);
  const diagnosesQ = useVisitpadDiagnoses(undefined, undefined, FORM_PAGE);
  const medicinesQ = useVisitpadMedicines(undefined, undefined, FORM_PAGE);
  const chronicQ = useVisitpadChronicIllnesses(undefined, undefined, FORM_PAGE);
  const chiefComplaintsQ = useVisitpadChiefComplaints(undefined, undefined, undefined, FORM_PAGE);

  const queries = [
    vaccinesQ,
    manufacturersQ,
    allergensQ,
    reactionsQ,
    diagnosesQ,
    medicinesQ,
    chronicQ,
    chiefComplaintsQ,
  ];

  const medicines = useMemo(
    () => activeVisitpadCatalogRows(medicinesQ.data?.data),
    [medicinesQ.data?.data],
  );

  return {
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    vaccineOptions: visitpadDisplayNameOptions(vaccinesQ.data?.data),
    manufacturerOptions: visitpadDisplayNameOptions(manufacturersQ.data?.data),
    allergenOptions: visitpadDisplayNameOptions(allergensQ.data?.data),
    allergyReactionOptions: visitpadDisplayNameOptions(reactionsQ.data?.data),
    diagnosisOptions: visitpadDiagnosisOptions(diagnosesQ.data?.data),
    medicineOptions: visitpadMedicineOptions(medicinesQ.data?.data),
    chronicIllnessOptions: visitpadDisplayNameOptions(chronicQ.data?.data),
    chiefComplaintOptions: visitpadDisplayNameOptions(chiefComplaintsQ.data?.data),
    medicines,
  };
}
