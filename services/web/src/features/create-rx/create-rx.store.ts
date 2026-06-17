import { create } from 'zustand';
import type { VisitpadFieldError } from './lib/visitpad-validation';
import {
  emptyAllergyRow,
  emptyComplaintRow,
  emptyDiagnosisRow,
  emptyImagingRow,
  emptyImmunizationRow,
  emptyMedicineRow,
  emptyPhysicalActivityRow,
  emptyProcedureRow,
  emptyTestRow,
} from './lib/row-factories';
import type {
  AllergyRow,
  CarePlanData,
  ChiefComplaintRow,
  CreateRxFormData,
  CreateRxMainTab,
  CreateRxRightTab,
  CreateRxSectionTab,
  CreateRxVisitContext,
  DiagnosisRow,
  ImagingRow,
  ImmunizationRow,
  MedicalHistoryData,
  MedicineRow,
  PhysicalActivityRow,
  ProcedureRow,
  TestRow,
} from './types';

const defaultMedicalHistory = (): MedicalHistoryData => ({
  chronicIllness: '',
  smokingStatus: '',
  alcoholStatus: '',
  dietType: '',
  historyOfPresentIllness: '',
});

const defaultCarePlan = (): CarePlanData => ({
  advice: '',
  referTo: '',
  nextVisit: '',
  nextVisitUnit: 'days',
});

const defaultFormData = (): CreateRxFormData => ({
  vitals: {},
  chiefComplaints: [emptyComplaintRow()],
  immunizations: [emptyImmunizationRow()],
  physicalActivity: [],
  medicalHistory: defaultMedicalHistory(),
  allergyDetails: [],
  diagnosis: [],
  medicines: [],
  testsRequired: [],
  imagingRequired: [],
  procedures: [],
  carePlan: defaultCarePlan(),
});

interface CreateRxState {
  context: CreateRxVisitContext | null;
  opdPrescriptionId: string | null;
  isReadOnly: boolean;
  loading: boolean;
  activeMainTab: CreateRxMainTab;
  activeSectionTab: CreateRxSectionTab;
  activeRightTab: CreateRxRightTab;
  priorVisitSearch: string;
  formData: CreateRxFormData;
  visitpadFieldErrors: VisitpadFieldError[];

  resetForVisit: (
    ctx: CreateRxVisitContext | null,
    isReadOnly: boolean,
    initialFormData?: CreateRxFormData,
    opdPrescriptionId?: string | null,
  ) => void;
  setLoading: (loading: boolean) => void;
  setActiveMainTab: (tab: CreateRxMainTab) => void;
  setActiveSectionTab: (tab: CreateRxSectionTab) => void;
  setActiveRightTab: (tab: CreateRxRightTab) => void;
  setPriorVisitSearch: (query: string) => void;
  setVisitpadFieldErrors: (errors: VisitpadFieldError[]) => void;
  clearVisitpadFieldErrors: () => void;
  setVital: (code: string, value: string) => void;
  patchMedicalHistory: (patch: Partial<MedicalHistoryData>) => void;
  patchCarePlan: (patch: Partial<CarePlanData>) => void;
  addComplaintRow: () => void;
  removeComplaintRow: (index: number) => void;
  updateComplaintRow: (index: number, field: keyof ChiefComplaintRow, value: string) => void;
  addImmunizationRow: () => void;
  removeImmunizationRow: (index: number) => void;
  updateImmunizationRow: (index: number, field: keyof ImmunizationRow, value: string) => void;
  addPhysicalActivityRow: () => void;
  removePhysicalActivityRow: (index: number) => void;
  updatePhysicalActivityRow: (index: number, field: keyof PhysicalActivityRow, value: string) => void;
  addAllergyRow: () => void;
  removeAllergyRow: (index: number) => void;
  updateAllergyRow: (index: number, field: keyof AllergyRow, value: string) => void;
  addDiagnosisRow: () => void;
  removeDiagnosisRow: (index: number) => void;
  updateDiagnosisRow: (index: number, field: keyof DiagnosisRow, value: string) => void;
  addMedicineRow: () => void;
  removeMedicineRow: (index: number) => void;
  updateMedicineRow: (index: number, field: keyof MedicineRow, value: string) => void;
  patchMedicineRow: (index: number, patch: Partial<MedicineRow>) => void;
  addTestRow: () => void;
  removeTestRow: (index: number) => void;
  updateTestRow: (index: number, field: keyof TestRow, value: string) => void;
  addImagingRow: () => void;
  removeImagingRow: (index: number) => void;
  updateImagingRow: (index: number, field: keyof ImagingRow, value: string) => void;
  addProcedureRow: () => void;
  removeProcedureRow: (index: number) => void;
  updateProcedureRow: (index: number, field: keyof ProcedureRow, value: string) => void;
  patchProcedureRow: (index: number, patch: Partial<ProcedureRow>) => void;
}

export const useCreateRxStore = create<CreateRxState>((set) => ({
  context: null,
  opdPrescriptionId: null,
  isReadOnly: false,
  loading: true,
  activeMainTab: 'visitpad',
  activeSectionTab: 'pre-consult',
  activeRightTab: 'medical-history',
  priorVisitSearch: '',
  formData: defaultFormData(),
  visitpadFieldErrors: [],

  resetForVisit: (ctx, isReadOnly, initialFormData, opdPrescriptionId = null) =>
    set({
      context: ctx,
      opdPrescriptionId,
      isReadOnly,
      loading: false,
      activeMainTab: 'visitpad',
      activeSectionTab: 'pre-consult',
      activeRightTab: 'medical-history',
      priorVisitSearch: '',
      formData: initialFormData ?? defaultFormData(),
      visitpadFieldErrors: [],
    }),

  setLoading: (loading) => set({ loading }),
  setVisitpadFieldErrors: (errors) => set({ visitpadFieldErrors: errors }),
  clearVisitpadFieldErrors: () => set({ visitpadFieldErrors: [] }),
  setActiveMainTab: (tab) => set({ activeMainTab: tab }),
  setActiveSectionTab: (tab) => set({ activeSectionTab: tab }),
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  setPriorVisitSearch: (query) => set({ priorVisitSearch: query }),

  setVital: (code, value) =>
    set((s) => ({
      formData: { ...s.formData, vitals: { ...s.formData.vitals, [code]: value } },
    })),

  patchMedicalHistory: (patch) =>
    set((s) => ({
      formData: {
        ...s.formData,
        medicalHistory: { ...s.formData.medicalHistory, ...patch },
      },
    })),

  patchCarePlan: (patch) =>
    set((s) => ({
      formData: { ...s.formData, carePlan: { ...s.formData.carePlan, ...patch } },
    })),

  addComplaintRow: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        chiefComplaints: [...s.formData.chiefComplaints, emptyComplaintRow()],
      },
    })),
  removeComplaintRow: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        chiefComplaints: s.formData.chiefComplaints.filter((_, i) => i !== index),
      },
    })),
  updateComplaintRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        chiefComplaints: s.formData.chiefComplaints.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addImmunizationRow: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        immunizations: [...s.formData.immunizations, emptyImmunizationRow()],
      },
    })),
  removeImmunizationRow: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        immunizations: s.formData.immunizations.filter((_, i) => i !== index),
      },
    })),
  updateImmunizationRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        immunizations: s.formData.immunizations.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addPhysicalActivityRow: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        physicalActivity: [...s.formData.physicalActivity, emptyPhysicalActivityRow()],
      },
    })),
  removePhysicalActivityRow: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        physicalActivity: s.formData.physicalActivity.filter((_, i) => i !== index),
      },
    })),
  updatePhysicalActivityRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        physicalActivity: s.formData.physicalActivity.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addAllergyRow: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        allergyDetails: [...s.formData.allergyDetails, emptyAllergyRow()],
      },
    })),
  removeAllergyRow: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        allergyDetails: s.formData.allergyDetails.filter((_, i) => i !== index),
      },
    })),
  updateAllergyRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        allergyDetails: s.formData.allergyDetails.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addDiagnosisRow: () =>
    set((s) => ({
      formData: { ...s.formData, diagnosis: [...s.formData.diagnosis, emptyDiagnosisRow()] },
    })),
  removeDiagnosisRow: (index) =>
    set((s) => ({
      formData: { ...s.formData, diagnosis: s.formData.diagnosis.filter((_, i) => i !== index) },
    })),
  updateDiagnosisRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        diagnosis: s.formData.diagnosis.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addMedicineRow: () =>
    set((s) => ({
      formData: { ...s.formData, medicines: [...s.formData.medicines, emptyMedicineRow()] },
    })),
  removeMedicineRow: (index) =>
    set((s) => ({
      formData: { ...s.formData, medicines: s.formData.medicines.filter((_, i) => i !== index) },
    })),
  updateMedicineRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        medicines: s.formData.medicines.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),
  patchMedicineRow: (index, patch) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        medicines: s.formData.medicines.map((row, i) =>
          i === index ? { ...row, ...patch } : row,
        ),
      },
    })),

  addTestRow: () =>
    set((s) => ({
      formData: { ...s.formData, testsRequired: [...s.formData.testsRequired, emptyTestRow()] },
    })),
  removeTestRow: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        testsRequired: s.formData.testsRequired.filter((_, i) => i !== index),
      },
    })),
  updateTestRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        testsRequired: s.formData.testsRequired.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addImagingRow: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        imagingRequired: [...s.formData.imagingRequired, emptyImagingRow()],
      },
    })),
  removeImagingRow: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        imagingRequired: s.formData.imagingRequired.filter((_, i) => i !== index),
      },
    })),
  updateImagingRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        imagingRequired: s.formData.imagingRequired.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),

  addProcedureRow: () =>
    set((s) => ({
      formData: { ...s.formData, procedures: [...s.formData.procedures, emptyProcedureRow()] },
    })),
  removeProcedureRow: (index) =>
    set((s) => ({
      formData: { ...s.formData, procedures: s.formData.procedures.filter((_, i) => i !== index) },
    })),
  updateProcedureRow: (index, field, value) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        procedures: s.formData.procedures.map((row, i) =>
          i === index ? { ...row, [field]: value } : row,
        ),
      },
    })),
  patchProcedureRow: (index, patch) =>
    set((s) => ({
      visitpadFieldErrors: [],
      formData: {
        ...s.formData,
        procedures: s.formData.procedures.map((row, i) =>
          i === index ? { ...row, ...patch } : row,
        ),
      },
    })),
}));
