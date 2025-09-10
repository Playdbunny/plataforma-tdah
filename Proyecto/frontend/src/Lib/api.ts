import axios from 'axios';

// Configura la URL base del backend desde una variable de entorno
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

// Crea una instancia de Axios con la URL base
export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
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