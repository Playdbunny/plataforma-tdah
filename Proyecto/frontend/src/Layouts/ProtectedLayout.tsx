import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useRequireProfileComplete } from "@/Hooks";
import { useAppStore } from "@/stores/appStore";


// Este layout envuelve las rutas internas y ejecuta el guard
export default function ProtectedLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.user);
  const location = useLocation();

  if (!hydrated) return <div className="loading-container">Cargando…</div>;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  
  useRequireProfileComplete();
  return <Outlet />;
}
