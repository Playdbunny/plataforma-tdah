import { Outlet } from "react-router-dom";
import { useRequireProfileComplete } from "../Hooks/useRequireProfileComplete";

// Este layout envuelve las rutas internas y ejecuta el guard
export default function ProtectedLayout() {
  useRequireProfileComplete();
  return <Outlet />;
}
