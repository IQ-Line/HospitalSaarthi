import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/** Section ids shown in the “Customise sections” menu (matches production visit registration). */
export const VISIT_REGISTRATION_SECTION_IDS = [
  'patientDetails',
  'vitals',
  'appointmentDetails',
  'risAppointment',
  'labTests',
  'billing',
] as const;

export type VisitRegistrationSectionId = (typeof VISIT_REGISTRATION_SECTION_IDS)[number];

export const VISIT_REGISTRATION_SECTION_LABELS: Record<VisitRegistrationSectionId, string> = {
  patientDetails: 'Patient Details',
  vitals: 'Vitals',
  appointmentDetails: 'Appointment Details',
  risAppointment: 'RIS Appointment',
  labTests: 'Lab Tests',
  billing: 'Billing',
};

const defaultVisibility = (): Record<VisitRegistrationSectionId, boolean> =>
  Object.fromEntries(
    VISIT_REGISTRATION_SECTION_IDS.map((id) => [id, true]),
  ) as Record<VisitRegistrationSectionId, boolean>;

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
      { name: 'hims-visit-reg-sections' },
    ),
    { name: 'visit-reg-sections' },
  ),
);
