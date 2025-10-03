// ─────────────────────────────────────────────────────────────
// main.tsx — Punto de entrada. Monta RouterProvider con tu router.
// ─────────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";         // ← usamos router.tsx
import "./globals.css";
import { useAppStore } from "./stores/appStore";
import { setAuthTokenGetter } from "./Lib/api";
import { useAuthStore } from "./stores/authStore";

// Configura el getter de token para todas las peticiones API
setAuthTokenGetter(() => useAuthStore.getState().token);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
if (import.meta.env.DEV) {
  // Exponer para la consola
  (window as any).store = useAppStore;
  (window as any).addCoins = (n: number) => useAppStore.getState().addCoins(n);
  (window as any).spendCoins = (n: number) => useAppStore.getState().spendCoins(n);
  (window as any).setCoins = (n: number) => useAppStore.getState().updateUser({ coins: n });
  
}
