import { Router } from "express";
import passport from "passport";
import { signToken } from "./helpers/jwt-sign";
// URL base del frontend. Se toma de la variable de entorno y, si no existe,
// se usa localhost como respaldo para entornos de desarrollo.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
/**
 * Construye una URL absoluta hacia el frontend combinando el host definido
 * en la configuración con el pathname y cualquier parámetro de query extra.
 *
 * @param pathname Segmento del frontend al que se desea redirigir.
 * @param searchParams Pares clave/valor a insertar como query string.
 */
function buildFrontendUrl(pathname: string, searchParams: Record<string, string> = {}) {
  const url = new URL(pathname, FRONTEND_URL);
  // Inyectamos cada parámetro como parte del query string final.
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
const router = Router();
// /auth/google?tdahType=inatento|hiperactivo|combinado
router.get("/google", (req, res, next) => {
  const tdahType = (req.query.tdahType as string) || null;
  // Validación simple (opcional)
  const valid = ["inatento", "hiperactivo", "combinado"];
  const finalTdah = valid.includes(String(tdahType)) ? tdahType : null;
  // Serializamos un pequeño JSON como `state`. Passport lo enviará a Google y
  // luego lo recibiremos intacto en el callback para no perder contexto.
  const state = JSON.stringify({ tdahType: finalTdah });
  // Pasamos `state` a passport.authenticate para que Google nos lo devuelva.
  return passport.authenticate("google", {
    scope: ["profile", "email"],
    state,                      // <-- clave
  })(req, res, next);
});
// Callback: emite TU JWT y, si vino tdahType y el user lo tenía null, lo setea (lo haremos en la estrategia)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google/failure", session: true }),
  async (req: any, res) => {
    try {
      const user = req.user;
      // Firmamos un JWT "interno" con los datos mínimos para el backend.
      const token = signToken({ sub: user.id, role: user.role });
      // Luego firmamos un segundo token con la información que enviaremos al
      // frontend (token de sesión, datos del usuario serializados y el proveedor).
      const payload = signToken({ token, user: user.toJSON(), provider: "google" });
      // Construimos la URL final del frontend donde la SPA recibirá la respuesta
      // e interpretará el payload firmado para completar el login.
      const redirectUrl = buildFrontendUrl("/oauth/google/callback", { payload });
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error", error);
      // Si algo falla, redirigimos al login del frontend indicando el estado de error.
      const redirectUrl = buildFrontendUrl("/login", { oauth: "error" });
      return res.redirect(redirectUrl);
    }
  }
);
router.get("/google/failure", (_req, res) => {
  // Este handler captura la ruta de fallo de Passport y la envía al frontend.
  const redirectUrl = buildFrontendUrl("/login", { oauth: "error" });
  res.redirect(redirectUrl);
});
export default router;