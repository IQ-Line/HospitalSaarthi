import type { ModuleManifest } from '../types';

export const visitpadModuleManifest: ModuleManifest = {
  slug: 'visitpad',
  name: 'Visitpad',
  icon: 'layers',
  routePrefix: '/visitpad',
  sortOrder: 40,
  /** Catalog L1 slug tenants enable (see master-data `visitpad-templates`). */
  requiredModulesAny: ['visitpad-templates'],
  navigation: [
    { id: 'visitpad-units', label: 'Units', icon: 'ruler', route: '/visitpad/units' },
    {
      id: 'visitpad-conversions',
      label: 'Conversions',
      icon: 'arrow-right-left',
      route: '/visitpad/conversions',
      catalogModuleSlug: 'unit-conversions',
    },
    { id: 'visitpad-vitals', label: 'Vitals', icon: 'heart-pulse', route: '/visitpad/vitals' },
    { id: 'visitpad-chief-complaints', label: 'Chief complaints', icon: 'book-open', route: '/visitpad/chief-complaints' },
    { id: 'visitpad-diagnoses', label: 'Diagnosis', icon: 'stethoscope', route: '/visitpad/diagnoses' },
    { id: 'visitpad-allergens', label: 'Allergens', icon: 'syringe', route: '/visitpad/allergens' },
    {
      id: 'visitpad-reactions',
      label: 'Reactions',
      icon: 'shield-alert',
      route: '/visitpad/reactions',
      catalogModuleSlug: 'allergy-reactions',
    },
    {
      id: 'visitpad-rx-columns',
      label: 'Rx columns',
      icon: 'columns-2',
      route: '/visitpad/rx-columns',
      catalogModuleSlug: 'rxcolumns',
    },
    { id: 'visitpad-medicines', label: 'Medicines', icon: 'pill-bottle', route: '/visitpad/medicines' },
    {
      id: 'visitpad-chronic-illness',
      label: 'Chronic illness',
      icon: 'calendar-clock',
      route: '/visitpad/chronic-illness',
      catalogModuleSlug: 'chronic-illnesses',
    },
    { id: 'visitpad-procedures', label: 'Procedures', icon: 'scissors', route: '/visitpad/procedures' },
    { id: 'visitpad-vaccines', label: 'Vaccines', icon: 'flask-conical', route: '/visitpad/vaccines' },
    { id: 'visitpad-manufacturers', label: 'Manufacturers', icon: 'building', route: '/visitpad/manufacturers' },
  ],
};
