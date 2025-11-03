import axios from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

type SessionRefreshPayload = {
  token: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user?: unknown;
};

// Configura la URL base del backend desde una variable de entorno
const envBaseUrl = import.meta.env.VITE_API_URL;
const rawBaseUrl = envBaseUrl && envBaseUrl.trim() !== ""
  ? envBaseUrl.trim()
  : "http://localhost:4000";

function ensureApiBase(url: string) {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

const baseURL = ensureApiBase(rawBaseUrl);

export const getApiBaseUrl = () => baseURL;

export const getAdminApiBaseUrl = () => {
  const trimmed = baseURL.replace(/\/+$/, "");
  if (trimmed.endsWith("/admin")) {
    return trimmed;
  }
  return `${trimmed}/admin`;
};

// Crea una instancia de Axios con la URL base
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

// Interceptor de response → si 401, dispara logout del store
let refreshPromise: Promise<SessionRefreshPayload> | null = null;

async function requestRefresh(): Promise<SessionRefreshPayload> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<SessionRefreshPayload>(
        "/auth/refresh",
        {},
        { skipAuthRefresh: true }
      )
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
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined;

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
        if (!newToken) {
          throw new Error("Respuesta de refresh inválida: falta el token");
        }

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
