// src/stores/appStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;
type User = { id: string; name: string; email: string } | null;

type AppState = {
  tdahType: TDAHType;
  user: User;
  points: number;
  setTdahType: (t: TDAHType) => void;
  setUser: (u: User) => void;
  addPoints: (n: number) => void;
};

// 👇 ESTA exportación es la clave
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tdahType: null,
      user: null,
      points: 0,
      setTdahType: (t) => set({ tdahType: t }),
      setUser: (u) => set({ user: u }),
      addPoints: (n) => set((s) => ({ points: s.points + n })),
    }),
    { name: "synapquest-store" }
  )
);
