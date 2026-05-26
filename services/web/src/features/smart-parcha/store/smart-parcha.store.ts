import { create } from 'zustand';
import type { ConsultationAccess, FullContextResponse } from '../types';

type SmartParchaState = {
  visitId: string | null;
  context: FullContextResponse | null;
  access: ConsultationAccess | null;
  setVisit: (visitId: string, context: FullContextResponse, access: ConsultationAccess) => void;
  reset: () => void;
};

export const useSmartParchaStore = create<SmartParchaState>((set) => ({
  visitId: null,
  context: null,
  access: null,
  setVisit: (visitId, context, access) => set({ visitId, context, access }),
  reset: () => set({ visitId: null, context: null, access: null }),
}));
