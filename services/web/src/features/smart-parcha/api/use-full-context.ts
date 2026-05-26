import { useQuery } from '@tanstack/react-query';
import { fetchFullContext } from './client';
import { smartParchaKeys } from './query-keys';
import { resolveConsultationAccess } from '../lib/visit-consultation-access';
import { useSmartParchaStore } from '../store/smart-parcha.store';
import { useEffect } from 'react';

export function useSmartParchaFullContext(visitId: string, addendum = true) {
  const setVisit = useSmartParchaStore((s) => s.setVisit);

  const query = useQuery({
    queryKey: smartParchaKeys.fullContext(visitId, addendum),
    queryFn: () => fetchFullContext(visitId, addendum),
    enabled: Boolean(visitId),
  });

  useEffect(() => {
    if (!query.data) return;
    const access = resolveConsultationAccess(query.data.visit, {
      resumedSameDay: query.data.resumedSameDay,
      isAddendum: query.data.isAddendum,
    });
    setVisit(visitId, query.data, access);
  }, [query.data, visitId, setVisit]);

  const access = query.data
    ? resolveConsultationAccess(query.data.visit, {
        resumedSameDay: query.data.resumedSameDay,
        isAddendum: query.data.isAddendum,
      })
    : null;

  return { ...query, access };
}
