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

export const visitpadPrimaryTabs: Array<{
  id: VisitpadPrimaryTab;
  label: string;
  to: string;
}> = [
  { id: 'units', label: 'Units', to: '/visitpad/units' },
  { id: 'vitals', label: 'Vitals', to: '/visitpad/vitals' },
  { id: 'chief-complaints', label: 'Chief complaints', to: '/visitpad/chief-complaints' },
  { id: 'diagnoses', label: 'Diagnosis', to: '/visitpad/diagnoses' },
  { id: 'allergies', label: 'Allergies', to: '/visitpad/allergens' },
  { id: 'rx-columns', label: 'Rx columns', to: '/visitpad/rx-columns' },
  { id: 'medicines', label: 'Medicines', to: '/visitpad/medicines' },
  { id: 'chronic-illness', label: 'Chronic illness', to: '/visitpad/chronic-illness' },
  { id: 'procedures', label: 'Procedures', to: '/visitpad/procedures' },
  { id: 'vaccines', label: 'Vaccines', to: '/visitpad/vaccines' },
  { id: 'manufacturers', label: 'Manufacturers', to: '/visitpad/manufacturers' },
];
