import { useCallback, useState } from 'react';
import type {
  ClinicalReportQueryContext,
  ClinicalReportType,
} from '../api/clinical-documents';

interface PatientReportSelection {
  visitId: string;
  reportType: ClinicalReportType;
  reportContext?: ClinicalReportQueryContext;
}

export function usePatientReports(defaultContext?: ClinicalReportQueryContext) {
  const [selection, setSelection] = useState<PatientReportSelection | null>(null);

  const openReport = useCallback(
    (
      visitId: string,
      reportType: ClinicalReportType,
      reportContext?: ClinicalReportQueryContext,
    ) => {
      setSelection({
        visitId,
        reportType,
        reportContext: { ...defaultContext, ...reportContext },
      });
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
