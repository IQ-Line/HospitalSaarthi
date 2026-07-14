import { create } from 'zustand';

type PharmacyStoreState = {
  selectedStoreId: string | null;
  setSelectedStoreId: (storeId: string) => void;
  initializeFromAssignments: (primaryStoreId: string | null, storeIds: string[]) => void;
};

export const usePharmacyStore = create<PharmacyStoreState>((set, get) => ({
  selectedStoreId: null,
  setSelectedStoreId: (storeId) => set({ selectedStoreId: storeId }),
  initializeFromAssignments: (primaryStoreId, storeIds) => {
    const current = get().selectedStoreId;
    if (current && storeIds.includes(current)) {
      return;
    }
    if (primaryStoreId && storeIds.includes(primaryStoreId)) {
      set({ selectedStoreId: primaryStoreId });
      return;
    }
    set({ selectedStoreId: storeIds[0] ?? null });
  },
}));

export function useSelectedPharmacyStoreId(): string | null {
  return usePharmacyStore((state) => state.selectedStoreId);
}
