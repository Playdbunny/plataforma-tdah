// ─────────────────────────────────────────────────────────────
// App.tsx — Opcional: contenedor de providers globales.
// NO monta routers ni rutas aquí.
// ─────────────────────────────────────────────────────────────
import type { PropsWithChildren } from "react";

export default function App({ children }: PropsWithChildren) {
  // Aquí podrías envolver children con contextos globales si algún día los agregas.
  return <>{children}</>;
}
