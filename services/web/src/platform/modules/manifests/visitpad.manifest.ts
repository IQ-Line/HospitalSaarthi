import { MD_VISITPAD_CREATE, MD_VISITPAD_VIEW } from '@/lib/runtime-capability-keys';
import type { ModuleManifest } from '../types';

export const visitpadModuleManifest: ModuleManifest = {
  slug: 'visitpad',
  name: 'Visitpad',
  icon: 'layers',
  routePrefix: '/visitpad',
  sortOrder: 40,
  requiredCapabilities: [MD_VISITPAD_VIEW, MD_VISITPAD_CREATE],
  requiredModulesAny: ['visitpad-templates', 'visitpad', 'master-data', 'master_data'],
  navigation: [
    { id: 'visitpad-units', label: 'Units', icon: 'ruler', route: '/visitpad/units', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-conversions', label: 'Conversions', icon: 'arrow-right-left', route: '/visitpad/conversions', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-vitals', label: 'Vitals', icon: 'heart-pulse', route: '/visitpad/vitals', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-chief-complaints', label: 'Chief complaints', icon: 'book-open', route: '/visitpad/chief-complaints', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-diagnoses', label: 'Diagnosis', icon: 'stethoscope', route: '/visitpad/diagnoses', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-allergens', label: 'Allergens', icon: 'syringe', route: '/visitpad/allergens', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-reactions', label: 'Reactions', icon: 'shield-alert', route: '/visitpad/reactions', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-rx-columns', label: 'Rx columns', icon: 'columns-2', route: '/visitpad/rx-columns', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-medicines', label: 'Medicines', icon: 'pill-bottle', route: '/visitpad/medicines', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-chronic-illness', label: 'Chronic illness', icon: 'calendar-clock', route: '/visitpad/chronic-illness', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-procedures', label: 'Procedures', icon: 'scissors', route: '/visitpad/procedures', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-vaccines', label: 'Vaccines', icon: 'flask-conical', route: '/visitpad/vaccines', requiredCapabilities: [MD_VISITPAD_VIEW] },
    { id: 'visitpad-manufacturers', label: 'Manufacturers', icon: 'building', route: '/visitpad/manufacturers', requiredCapabilities: [MD_VISITPAD_VIEW] },
  ],
};
