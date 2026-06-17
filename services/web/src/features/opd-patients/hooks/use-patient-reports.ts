import { useCallback, useState } from 'react';
import { fetchFormattedPatientAddressForReport } from '../api/empi-patients';
import type {
  ClinicalReportQueryContext,
  ClinicalReportType,
} from '../api/clinical-documents';

interface PatientReportSelection {
  visitId: string;
  reportType: ClinicalReportType;
  reportContext?: ClinicalReportQueryContext;
}

type OpenReportContext = ClinicalReportQueryContext & { patientId?: string };

export function usePatientReports(defaultContext?: ClinicalReportQueryContext) {
  const [selection, setSelection] = useState<PatientReportSelection | null>(null);

  const openReport = useCallback(
    (
      visitId: string,
      reportType: ClinicalReportType,
      reportContext?: OpenReportContext,
    ) => {
      const { patientId, ...context } = reportContext ?? {};

      void (async () => {
        let patient_address = context.patient_address;
        if (patientId?.trim() && !patient_address?.trim()) {
          try {
            patient_address = await fetchFormattedPatientAddressForReport(patientId);
          } catch {
            patient_address = undefined;
          }
        }

        setSelection({
          visitId,
          reportType,
          reportContext: { ...defaultContext, ...context, patient_address },
        });
      })();
    },
    [defaultContext],
  );

  const closeReport = useCallback(() => {
    setSelection(null);
  }, []);

  return {
    selection,
    open: selection != null,
    openReport,
    closeReport,
  };
}
