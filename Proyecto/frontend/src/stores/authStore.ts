
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../Lib/api";
import { IUserSafe, TDAHType } from "../types/user";
import { useAppStore } from "./appStore";
import { reviveUserDates } from "../utils/user_serializers";
import { normalizeAvatarUrl } from "../utils/avatar";

type RegisterBody = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  tdahType?: TDAHType;
};
type LoginBody = { 
    email: string; password: string
};
type AuthResponse = {
  token: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string | Date;
  user?: any; // llega con strings → lo revivimos
};

type AuthState = {
  user: IUserSafe | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  setUser: (u: Partial<IUserSafe>) => void;
  setSession: (session: AuthResponse) => void;
  refreshSession: (session: AuthResponse) => void;
  login: (body: LoginBody) => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => void;

  acceptOAuthSession: (data: AuthResponse) => void;
};

const setAuthHeader = (token: string | null) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const syncAppStoreUser = (user: IUserSafe | null) => {
        try {
          const { setUser: setAppUser } = useAppStore.getState();
          setAppUser(user as Parameters<typeof setAppUser>[0]);
        } catch {
          // noop: si appStore no está listo simplemente ignoramos
        }
      };

      const clearAppStoreSession = () => {
        try {
          useAppStore.getState().logout();
        } catch {
          // noop
        }
      };

      const applySession = (session: AuthResponse) => {
        const baseUser = session.user ?? get().user;
        const revivedUser = baseUser ? reviveUserDates(baseUser) : null;

        setAuthHeader(session.token);
        set({
          token: session.token,
          user: revivedUser,
          error: null,
        });
        syncAppStoreUser(revivedUser);
      };

      return {
        user: null,
        token: null,
        loading: false,
        error: null,

        setUser: (u) => {
          const current = get().user;
          if (!current) return;

          const patch: Partial<IUserSafe> = { ...u };
          if (patch.avatarUrl !== undefined) {
            patch.avatarUrl = normalizeAvatarUrl(patch.avatarUrl);
          }

          const { streak: patchStreak, ...restPatch } = patch;

          set({
            user: {
              ...current,
              ...restPatch,
              streak: patchStreak
                ? { ...current.streak, ...patchStreak }
                : current.streak,
            },
          });
        },

        setSession: (session) => {
          applySession(session);
        },

        refreshSession: (session) => {
          applySession(session);
        },

        register: async (body) => {
          try {
            set({ loading: true, error: null });
            const { data } = await api.post<AuthResponse>("/auth/register", body);
            get().setSession(data);
          } catch (err: any) {
            set({
              error: err?.response?.data?.error ?? err?.message ?? "No se pudo registrar",
            });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        login: async (body) => {
          try {
            set({ loading: true, error: null });
            const { data } = await api.post<AuthResponse>("/auth/login", body);
            get().setSession(data);
          } catch (err: any) {
            set({
              error:
                err?.response?.data?.error ?? err?.message ?? "No se pudo iniciar sesión",
            });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        logout: () => {
          void api.post("/auth/logout").catch(() => {});
          setAuthHeader(null);
          set({
            user: null,
            token: null,
            error: null,
            loading: false,
          });
          clearAppStoreSession();
        },

        acceptOAuthSession: (session) => {
          applySession(session);
        },
      };
    },
    {
      name: "sq_auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // reinyecta token y revive fechas post-hidratación
        setAuthHeader(state?.token ?? null);
        if (state?.user) {
          state.user = reviveUserDates(state.user as any);
        }
      },
    }
  )
);
