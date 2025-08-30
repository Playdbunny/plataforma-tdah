// src/stores/appStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;

// Personaje elegido por el usuario (sprite mostrado en Profile)
export type Character = {
  id: string;
  name: string;
  sprite: string; // ruta a la imagen (p.ej. "/characters/bunny_idle.png")
};

// Datos de usuario (extensible, todos opcionales salvo id/name/email)
export type User = {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  level?: number;
  xp?: number;
  nextXp?: number;
  location?: string;
  work?: string;
  education?: string;
  character?: Character; // ⬅️ personaje
} | null;

type AppState = {
  // Perfil / preferencias
  tdahType: TDAHType;
  user: User;

  // Monedas / puntos (mantengo "points" por compat)
  points: number;
  wallet: { coins: number };

  // Actions
  setTdahType: (t: TDAHType) => void;
  setUser: (u: User) => void;
  updateUser: (patch: Partial<NonNullable<User>>) => void;
  setCharacter: (c: Character) => void;
  setAvatar: (url: string) => void;

  addPoints: (n: number) => void; // sigue existiendo
  addCoins: (n: number) => void;  // alias explícito
  logout: () => void;
};

// NOTA: version para migraciones (rellenar wallet.coins desde points)
const STORE_VERSION = 2;

// 👇 export principal
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tdahType: null,
      user: null,

      points: 0,
      wallet: { coins: 0 },

      setTdahType: (t) => set({ tdahType: t }),
      setUser: (u) => set({ user: u }),

      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),

      setCharacter: (c) =>
        set((s) => (s.user ? { user: { ...s.user, character: c } } : s)),

      setAvatar: (url) =>
        set((s) => (s.user ? { user: { ...s.user, avatarUrl: url } } : s)),

      addPoints: (n) =>
        set((s) => ({
          points: s.points + n,
          wallet: { coins: (s.wallet?.coins ?? 0) + n },
        })),

      addCoins: (n) =>
        set((s) => ({
          points: s.points + n, // mantenemos ambos en sync por compat
          wallet: { coins: (s.wallet?.coins ?? 0) + n },
        })),

      logout: () => set({ user: null }),
    }),
    {
      name: "synapquest-store",
      version: STORE_VERSION,
      // Migra estados antiguos que no tenían wallet
      migrate: (state: any, version) => {
        if (version < 2) {
          return {
            ...state,
            wallet: { coins: state?.points ?? 0 },
          };
        }
        return state;
      },
    }
  )
);
