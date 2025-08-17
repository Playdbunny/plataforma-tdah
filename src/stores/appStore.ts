// src/stores/appStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TDAHType = "Inatento" | "Hiperactivo-Impulsivo" | "Combinado";

type AppState = {
  tdahType: TDAHType | null;
  setTdahType: (t: TDAHType) => void;
  clear: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tdahType: null,
      setTdahType: (t) => set({ tdahType: t }),
      clear: () => set({ tdahType: null }),
    }),
    { name: "app-store" }
  )
);
