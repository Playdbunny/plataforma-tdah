import axios from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// ---- Extensión de tipos para una flag custom en requests ----
declare module "axios" {
  // Permitimos usar `skipAuthRefresh` en la config sin errores de TS
  interface InternalAxiosRequestConfig<D = any> {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}

type SessionRefreshPayload = {
  token: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user?: unknown;
};

// ===== Base URL =====
const baseURL = "/api";

export const getApiBaseUrl = () => baseURL;

export const getAdminApiBaseUrl = () => {
  const trimmed = baseURL.replace(/\/+$/, "");
  return trimmed.endsWith("/admin") ? trimmed : `${trimmed}/admin`;
};

// ===== Axios instance =====
export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

// "Inyección" de funciones para evitar import circular con el store
let _getToken: () => string | null = () => null;
let _onUnauthorized: () => void = () => {};
let _onSessionRefresh: (payload: SessionRefreshPayload) => void = () => {};

export function setAuthTokenGetter(getter: () => string | null) {
  _getToken = getter;
}

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

export function setOnSessionRefresh(cb: (payload: SessionRefreshPayload) => void) {
  _onSessionRefresh = cb;
}

// Interceptor de request → adjunta Bearer si hay token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = _getToken?.();
  if (token) {
    const headers: any = (config.headers ??= {} as any);
    if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${token}`);
    else headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response → si 401, intenta refresh una vez
let refreshPromise: Promise<SessionRefreshPayload> | null = null;

async function requestRefresh(): Promise<SessionRefreshPayload> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<SessionRefreshPayload>("/auth/refresh", {}, { skipAuthRefresh: true })
      .then((response: AxiosResponse<SessionRefreshPayload>) => {
        const payload = response.data;
        _onSessionRefresh?.(payload);
        return payload;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise!;
}

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const originalRequest = err.config as InternalAxiosRequestConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshData = await requestRefresh();
        const newToken = refreshData.token;
        if (!newToken) throw new Error("Respuesta de refresh inválida: falta el token");

        const headers: any = (originalRequest.headers ??= {} as any);
        if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${newToken}`);
        else headers.Authorization = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        _onUnauthorized?.();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !originalRequest?.skipAuthRefresh) {
      _onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

export default api;
