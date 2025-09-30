// src/stores/appStore.ts
// ============================================================
// Store global de la app (perfil, sesión, preferencias) usando Zustand + persist
// ============================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ======================
   Tipos base del dominio
   ====================== */
export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;

// Rol del usuario para permisos/rutas
export type UserRole = "admin" | "student";

// Personaje elegido por el usuario (sprite mostrado en Profile)
export type Character = {
  id: string;
  name: string;
  sprite: string; // ruta a la imagen (p.ej. "/characters/bunny_idle.png")
};

// Datos de usuario (TODOS opcionales salvo id/name/email/role)
export type User = {
  id: string;
  name: string;
  email: string;

  // 🔐 Rol requerido para guards (/admin, etc.)
  role: UserRole;

  username?: string;
  avatarUrl?: string;  
  tdahType?: TDAHType;
  level?: number;
  xp?: number;
  
  nextXp?: number;
  // location?: string;
  // work?: string;
  education?: string;
  character?: Character;

  // 🪙 Economía/tienda
  coins?: number;
  ownedCharacters?: string[];
  streak?: { count: number; lastCheck?: Date | null };
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date | null;
} | null;

/* ======================
   Estado + Acciones
   ====================== */
type AppState = {
  // 👇 indica si el store ya rehidrató desde localStorage
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  // Perfil / preferencias
  tdahType: TDAHType;
  user: User;

  // Selectores útiles
  isAdmin: () => boolean;

  // Monedas / puntos (compat con código viejo)
  points: number;
  wallet: { coins: number };

  // Actions
  setTdahType: (t: TDAHType) => void;
  setUser: (u: User) => void;
  updateUser: (patch: Partial<NonNullable<User>>) => void;
  setCharacter: (c: Character) => void;
  setAvatar: (url: string) => void;
  addPoints: (n: number) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => void;
  logout: () => void;
};

/* ======================
   Persistencia + Migración
   - v4: agrega user.role (default "student")
   - v3: aseguraba coins/ownedCharacters
   ====================== */
const STORE_VERSION = 4;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* ===== Estado inicial ===== */
      hydrated: false,
      tdahType: null,
      user: null,

      points: 0,
      wallet: { coins: 0 },

      /* ===== Setter del flag ===== */
      setHydrated: (v) => set({ hydrated: v }),

      /* ===== Selectores ===== */
      isAdmin: () => {
        const u = get().user;
        return !!u && u.role === "admin";
      },

      /* ===== Acciones ===== */
      setTdahType: (t) => set({ tdahType: t }),

      setUser: (u) => {
        // Si te llega un usuario con coins, sincronizamos compat con wallet/points
        if (u && typeof u.coins === "number") {
          const coins = Math.max(0, Math.floor(u.coins));
          set({ user: { ...u, coins }, points: coins, wallet: { coins } });
        } else {
          set({ user: u });
        }
      },

      updateUser: (patch) =>
        set((s) => {
          if (!s.user) return s; // nada que actualizar si no hay sesión
          const nextUser = { ...s.user, ...patch };

          // Si el patch trae coins válidas, sincronizamos todo (compat)
          if (typeof patch.coins === "number" && Number.isFinite(patch.coins)) {
            const coins = Math.max(0, Math.floor(patch.coins));
            return {
              user: { ...nextUser, coins },
              points: coins, // compat: points = coins
              wallet: { coins },
            };
          }

          return { user: nextUser };
        }),

      setCharacter: (c) =>
        set((s) => (s.user ? { user: { ...s.user, character: c } } : s)),

      setAvatar: (url) =>
        set((s) => (s.user ? { user: { ...s.user, avatarUrl: url } } : s)),

      // ⤵️ Compat: sumar puntos también suma monedas
      addPoints: (n) =>
        set((s) => {
          const add = Math.max(0, Math.floor(n));
          const base = (s.user?.coins ?? s.wallet?.coins ?? s.points ?? 0) + add;

          return {
            points: (s.points ?? 0) + add,
            wallet: { coins: base },
            user: s.user ? { ...s.user, coins: base } : s.user,
          };
        }),

      // ✅ API nueva: sumar monedas
      addCoins: (n) =>
        set((s) => {
          const add = Math.max(0, Math.floor(n));
          const base = s.user?.coins ?? s.wallet?.coins ?? s.points ?? 0;
          const coins = base + add;

          return {
            points: coins, // mantenemos 1:1 para compat
            wallet: { coins },
            user: s.user ? { ...s.user, coins } : s.user,
          };
        }),

      // ✅ Gastar monedas con clamp a 0
      spendCoins: (n) =>
        set((s) => {
          const sub = Math.max(0, Math.floor(n));
          const base = s.user?.coins ?? s.wallet?.coins ?? s.points ?? 0;
          const coins = Math.max(0, base - sub);

          return {
            points: coins,
            wallet: { coins },
            user: s.user ? { ...s.user, coins } : s.user,
          };
        }),

      logout: () => set({ user: null }),
    }),
    {
      name: "synapquest-store",
      version: STORE_VERSION,

      /* ==========
         Hidratación: cuando termina de leer localStorage,
         marcamos hydrated=true para que los guards no redirijan
         antes de tener el user real cargado.
         ========== */
      onRehydrateStorage: () => {
        return () => {
          try {
            useAppStore.setState({ hydrated: true });
          } catch {
            // noop
          }
        };
      },

      /* ==========
         Migraciones
         ========== */
      migrate: (state: any, version) => {
        // v3 -> v4: asegura user.role (por defecto "student")
        if (version < 4) {
          const user = state?.user;
          if (user && !user.role) {
            state = {
              ...state,
              user: { ...user, role: "student" },
            };
          }
          return state;
        }

        // v2 -> v3: asegura user.coins y ownedCharacters
        if (version < 3) {
          const legacyCoins =
            state?.user?.coins ?? state?.wallet?.coins ?? state?.points ?? 0;

          return {
            ...state,
            points: legacyCoins,
            wallet: { coins: legacyCoins },
            user: state?.user
              ? {
                  ...state.user,
                  coins: legacyCoins,
                  ownedCharacters:
                    state.user.ownedCharacters ?? [
                      "boy",
                      "girl",
                      "foxboy",
                      "foxgirl",
                      "robot",
                    ],
                  role: state.user.role ?? "student",
                }
              : state.user,
          };
        }

        return state;
      },
    }
  )
);

// ✅ Asegura que el flag 'hydrated' se encienda siempre
// (algunos entornos no disparan onRehydrateStorage como esperas)
(useAppStore as any).persist?.onFinishHydration?.(() => {
  useAppStore.setState({ hydrated: true });
});
if ((useAppStore as any).persist?.hasHydrated?.()) {
  useAppStore.setState({ hydrated: true });
}
