import axios from 'axios';

// Configura la URL base del backend desde una variable de entorno
const envBaseUrl = import.meta.env.VITE_API_URL;
const rawBaseUrl = envBaseUrl && envBaseUrl.trim() !== ""
  ? envBaseUrl.trim()
  : "http://localhost:4000";

const baseURL = rawBaseUrl.replace(/\/+$/, "");

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
  headers: { Accept: "application/json" },
});

// "Inyección" de funciones para evitar import circular con el store
let _getToken: () => string | null = () => null;
let _onUnauthorized: () => void = () => {};

export function setAuthTokenGetter(getter: () => string | null) {
  _getToken = getter;
}

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

// Interceptor de request → adjunta Bearer si hay token
api.interceptors.request.use((config) => {
  const token = _getToken?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor de response → si 401, dispara logout del store
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) _onUnauthorized?.();
    return Promise.reject(err);
  }
);

export default api;
