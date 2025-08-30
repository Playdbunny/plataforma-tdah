import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/appStore";

// Hook que redirige a /profile/edit si el perfil no está completo
export function useRequireProfileComplete() {
  const user = useAppStore(s => s.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user) return; // no logeado, no hacemos nada
    const incomplete = !user.username || !user.character;
    const isEditing  = pathname.startsWith("/profile/edit");
    if (incomplete && !isEditing) {
      navigate("/profile/edit");
    }
  }, [user, pathname, navigate]);
}
