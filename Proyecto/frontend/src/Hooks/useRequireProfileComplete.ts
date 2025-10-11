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
    const usernameOk = typeof user.username === "string" && user.username.trim().length >= 3;
    const educationOk = typeof user.education === "string" && user.education.trim().length > 0;
    const characterOk = !!user.character?.id;
    const incomplete = !usernameOk || !educationOk || !characterOk;
    const isEditing  = pathname.startsWith("/profile/edit");
    if (incomplete && !isEditing) {
      navigate("/profile/edit");
    }
  }, [user, pathname, navigate]);
}
