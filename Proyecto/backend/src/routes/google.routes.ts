import { Router } from "express";
import passport from "passport";
import { signToken } from "./helpers/jwt-sign";
import { issueSession } from "./helpers/session";
import { setRefreshTokenCookie } from "./helpers/authCookies";
import { GoogleTokenVerificationError, verifyGoogleIdToken } from "../services/googleVerifier";
// URL base del frontend. Se toma de la variable de entorno y, si no existe,
// se usa localhost como respaldo para entornos de desarrollo.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
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

function getErrorMessage(error: unknown) {
  if (error instanceof GoogleTokenVerificationError) return error.message;
  if (error instanceof Error) return error.message;
  return "Token de Google inválido";
}

function buildErrorRedirectUrl(message: string) {
  const payload = JSON.stringify({ error: message });
  return buildFrontendUrl("/login", { oauth: "error", payload });
}

router.post("/google/verify", async (req, res) => {
  const idToken: string | undefined = req.body?.id_token || req.body?.idToken;
  if (!idToken) {
    return res.status(400).json({ error: "El id_token es obligatorio" });
  }

  try {
    const payload = await verifyGoogleIdToken(idToken);
    return res.status(200).json(payload);
  } catch (error) {
    const message = getErrorMessage(error);
    return res.status(401).json({ error: message });
  }
});
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
  passport.authenticate("google", { failureRedirect: "/api/auth/google/failure", session: true }),
  async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        throw new GoogleTokenVerificationError("No se pudo autenticar el usuario de Google");
      }
      // Firmamos un JWT "interno" con los datos mínimos para el backend.
      const session = await issueSession(user);
      setRefreshTokenCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
      // Firmamos un segundo token con la información que enviaremos al
      // frontend (token de sesión, datos del usuario serializados y el proveedor).
      const { refreshToken: _omitRefreshToken, ...sessionForFrontend } = session;
      const payload = signToken({ ...sessionForFrontend, provider: "google" });
      // Construimos la URL final del frontend donde la SPA recibirá la respuesta
      // e interpretará el payload firmado para completar el login.
      const redirectUrl = buildFrontendUrl("/oauth/google/callback", { payload });
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error", error);
      const message = getErrorMessage(error);
      const redirectUrl = buildErrorRedirectUrl(message);
      return res.redirect(redirectUrl);
    }
  }
);
router.get("/google/failure", (_req, res) => {
  // Este handler captura la ruta de fallo de Passport y la envía al frontend.
  const redirectUrl = buildErrorRedirectUrl("Fallo en la autenticación con Google");
  res.redirect(redirectUrl);
});
export default router;