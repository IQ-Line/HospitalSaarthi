import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOpdPatientDetails } from '../api/opd-patient-details';
import { opdPatientsQueryKeys } from '../api/query-keys';
import type { OpdPatientVisitRow } from '../types';

export function useOpdPatientDetailsDialog() {
  const [selectedRow, setSelectedRow] = useState<OpdPatientVisitRow | null>(null);

  const { data: details, isLoading, isFetching } = useQuery({
    queryKey: opdPatientsQueryKeys.detail(selectedRow),
    queryFn: () => fetchOpdPatientDetails(selectedRow!),
    enabled: selectedRow !== null,
  });

  const open = selectedRow !== null;

  const onRowClick = useCallback((row: OpdPatientVisitRow) => {
    setSelectedRow(row);
  }, []);

  const onClose = useCallback(() => {
    setSelectedRow(null);
  }, []);

  return {
    open,
    details: details ?? null,
    isLoading: isLoading || isFetching,
    onRowClick,
    onClose,
  };
}
