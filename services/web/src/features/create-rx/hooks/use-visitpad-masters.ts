import { useMemo } from 'react';
import {
  useVisitpadAllergens,
  useVisitpadAllergyReactions,
  useVisitpadChiefComplaints,
  useVisitpadChronicIllnesses,
  useVisitpadDiagnoses,
  useVisitpadManufacturers,
  useVisitpadMedicines,
  useVisitpadProcedures,
  useVisitpadRxColumns,
  useVisitpadVaccines,
  VISITPAD_CATALOG_FORM_PAGE,
} from '@/features/visitpad/api';
import type { VisitpadMedicine, VisitpadProcedure, VisitpadRxColumn } from '@/features/visitpad/types';
import {
  activeVisitpadCatalogRows,
  visitpadDiagnosisOptions,
  visitpadDisplayNameOptions,
  visitpadMedicineOptions,
  visitpadMethodStrengthOptions,
  visitpadProcedureOptions,
  type VisitpadSelectOption,
} from '../lib/visitpad-catalog-options';

const FORM_PAGE = VISITPAD_CATALOG_FORM_PAGE;

export function useVisitpadMasters(): {
  isLoading: boolean;
  isError: boolean;
  vaccineOptions: VisitpadSelectOption[];
  manufacturerOptions: VisitpadSelectOption[];
  allergenOptions: VisitpadSelectOption[];
  allergyReactionOptions: VisitpadSelectOption[];
  diagnosisOptions: VisitpadSelectOption[];
  medicineOptions: VisitpadSelectOption[];
  procedureOptions: VisitpadSelectOption[];
  methodStrengthOptions: VisitpadSelectOption[];
  chronicIllnessOptions: VisitpadSelectOption[];
  chiefComplaintOptions: VisitpadSelectOption[];
  medicines: VisitpadMedicine[];
  procedures: VisitpadProcedure[];
  methodStrengthColumns: VisitpadRxColumn[];
} {
  const vaccinesQ = useVisitpadVaccines(undefined, FORM_PAGE);
  const manufacturersQ = useVisitpadManufacturers(undefined, FORM_PAGE);
  const allergensQ = useVisitpadAllergens(undefined, undefined, FORM_PAGE);
  const reactionsQ = useVisitpadAllergyReactions(undefined, FORM_PAGE);
  const diagnosesQ = useVisitpadDiagnoses(undefined, undefined, FORM_PAGE);
  const medicinesQ = useVisitpadMedicines(undefined, undefined, FORM_PAGE);
  const proceduresQ = useVisitpadProcedures(undefined, undefined, undefined, FORM_PAGE);
  const methodStrengthQ = useVisitpadRxColumns(undefined, 'method_strength', FORM_PAGE);
  const chronicQ = useVisitpadChronicIllnesses(undefined, undefined, FORM_PAGE);
  const chiefComplaintsQ = useVisitpadChiefComplaints(undefined, undefined, undefined, FORM_PAGE);

  const queries = [
    vaccinesQ,
    manufacturersQ,
    allergensQ,
    reactionsQ,
    diagnosesQ,
    medicinesQ,
    proceduresQ,
    methodStrengthQ,
    chronicQ,
    chiefComplaintsQ,
  ];

  const medicines = useMemo(
    () => activeVisitpadCatalogRows(medicinesQ.data?.data),
    [medicinesQ.data?.data],
  );
  const procedures = useMemo(
    () => activeVisitpadCatalogRows(proceduresQ.data?.data),
    [proceduresQ.data?.data],
  );
  const methodStrengthColumns = useMemo(
    () => activeVisitpadCatalogRows(methodStrengthQ.data?.data),
    [methodStrengthQ.data?.data],
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
    procedureOptions: visitpadProcedureOptions(proceduresQ.data?.data),
    methodStrengthOptions: visitpadMethodStrengthOptions(methodStrengthQ.data?.data),
    chronicIllnessOptions: visitpadDisplayNameOptions(chronicQ.data?.data),
    chiefComplaintOptions: visitpadDisplayNameOptions(chiefComplaintsQ.data?.data),
    medicines,
    procedures,
    methodStrengthColumns,
  };
}
