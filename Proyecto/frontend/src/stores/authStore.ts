
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../Lib/api";
import { IUserSafe, TDAHType } from "../types/user";
import { reviveUserDates } from "../utils/user_serializers";

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
type AuthResponse = { token: string; user: any }; // llega con strings → lo revivimos

type AuthState = {
  user: IUserSafe | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  setUser: (u: Partial<IUserSafe>) => void;
  setSession: (token: string, user: IUserSafe) => void;
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
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      setUser: (u) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...u, streak: { ...current.streak, ...u.streak } } });
      },

      setSession: (token, user) => {
        setAuthHeader(token);
        set({ token, user, error: null });
      },

      register: async (body) => {
        try {
          set({ loading: true, error: null });
          const { data } = await api.post<AuthResponse>("/auth/register", body);
          const user = reviveUserDates(data.user);
          get().setSession(data.token, user);
        } catch (err: any) {
          set({ error: err?.response?.data?.error ?? err?.message ?? "No se pudo registrar" });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      login: async (body) => {
        try {
          set({ loading: true, error: null });
          const { data } = await api.post<AuthResponse>("/auth/login", body);
          const user = reviveUserDates(data.user);
          get().setSession(data.token, user);
        } catch (err: any) {
          set({ error: err?.response?.data?.error ?? err?.message ?? "No se pudo iniciar sesión" });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      logout: () => {
        setAuthHeader(null);
        set({ user: null, token: null, error: null, loading: false });
      },

      acceptOAuthSession: ({ token, user }) => {
        // user llega con fechas string → revivir
        const revived = reviveUserDates(user);
        get().setSession(token, revived);
      },
    }),
    {
      name: "sq_auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
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
