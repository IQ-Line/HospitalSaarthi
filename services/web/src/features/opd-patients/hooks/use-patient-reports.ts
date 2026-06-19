import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTenantStore } from '@/stores/tenant.store';
import { fetchFormattedPatientAddressForReport } from '../api/empi-patients';
import type {
  ClinicalReportQueryContext,
  ClinicalReportType,
} from '../api/clinical-documents';

/** Default facility context for OPD / nurse clinical report previews. */
export function useClinicalReportQueryContext(): ClinicalReportQueryContext {
  const { tenantName, branches, activeBranch } = useTenantStore(
    useShallow((s) => ({
      tenantName: s.tenantName,
      branches: s.branches,
      activeBranch: s.activeBranch,
    })),
  );

  return useMemo(() => {
    const branch = branches.find((item) => item.id === activeBranch);
    return {
      facility_name: branch?.name ?? tenantName ?? undefined,
    };
  }, [activeBranch, branches, tenantName]);
}

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
