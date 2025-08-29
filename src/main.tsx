// ─────────────────────────────────────────────────────────────
// main.tsx — Punto de entrada. Monta RouterProvider con tu router.
// ─────────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";         // ← usamos router.tsx
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

