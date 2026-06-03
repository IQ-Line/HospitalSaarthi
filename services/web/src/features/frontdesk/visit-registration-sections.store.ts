import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/** Section ids shown in the “Customise sections” menu (matches production visit registration). */
export const VISIT_REGISTRATION_SECTION_IDS = [
  'patientDetails',
  'appointmentDetails',
  'risAppointment',
  'labTests',
  'billing',
] as const;

export type VisitRegistrationSectionId = (typeof VISIT_REGISTRATION_SECTION_IDS)[number];

export const VISIT_REGISTRATION_SECTION_LABELS: Record<VisitRegistrationSectionId, string> = {
  patientDetails: 'Patient Details',
  appointmentDetails: 'Appointment Details',
  risAppointment: 'RIS Appointment',
  labTests: 'Lab Tests',
  billing: 'Billing',
};

const defaultVisibility = (): Record<VisitRegistrationSectionId, boolean> =>
  ({
    patientDetails: true,
    appointmentDetails: true,
    billing: true,
    labTests: false,
    risAppointment: false,
  }) satisfies Record<VisitRegistrationSectionId, boolean>;

function migrateVisitRegistrationSections(persisted: unknown): Pick<
  VisitRegistrationSectionsState,
  'visible'
> {
  if (!persisted || typeof persisted !== 'object') {
    return { visible: defaultVisibility() };
  }
  const state = persisted as { visible?: Partial<Record<string, boolean>> };
  const visible = defaultVisibility();
  for (const id of VISIT_REGISTRATION_SECTION_IDS) {
    if (state.visible?.[id] !== undefined) {
      visible[id] = state.visible[id]!;
    }
  }
  return { visible };
}

interface VisitRegistrationSectionsState {
  visible: Record<VisitRegistrationSectionId, boolean>;
  setSectionVisible: (id: VisitRegistrationSectionId, visible: boolean) => void;
  isSectionVisible: (id: VisitRegistrationSectionId) => boolean;
}

export const useVisitRegistrationSectionsStore = create<VisitRegistrationSectionsState>()(
  devtools(
    persist(
      (set, get) => ({
        visible: defaultVisibility(),
        setSectionVisible: (id, visible) =>
          set(
            (state) => ({
              visible: { ...state.visible, [id]: visible },
            }),
            false,
            'setSectionVisible',
          ),
        isSectionVisible: (id) => get().visible[id] ?? true,
      }),
      { name: 'hims-visit-reg-sections', version: 1, migrate: migrateVisitRegistrationSections },
    ),
    { name: 'visit-reg-sections' },
  ),
);
