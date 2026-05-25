/** Primary shell tab (horizontal). */
export type VisitpadPrimaryTab =
  | 'units'
  | 'vitals'
  | 'chief-complaints'
  | 'diagnoses'
  | 'allergies'
  | 'rx-columns'
  | 'medicines'
  | 'chronic-illness'
  | 'procedures'
  | 'vaccines'
  | 'manufacturers';

import { visitpadPrimaryTabGroups } from '@/features/visitpad/lib/visitpad-access';

/** @deprecated Prefer `visitpadPrimaryTabGroups` + capability filtering. */
export const visitpadPrimaryTabs = visitpadPrimaryTabGroups.map(({ id, label, to }) => ({
  id,
  label,
  to,
}));
