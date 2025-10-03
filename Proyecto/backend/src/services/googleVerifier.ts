// Servicio para verificar y normalizar tokens de ID de Google
import { OAuth2Client, TokenPayload } from "google-auth-library";

// Emisores permitidos para el token de Google.
const ALLOWED_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);

// Estructura del perfil de usuario normalizado que retornamos.
export interface NormalizedGoogleProfile {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  givenName: string | null;
  familyName: string | null;
  locale: string | null;
  expiresAt: number;
}

// Cliente OAuth2 de Google (sin clientId/secret, solo para verificación de tokens)
const oauthClient = new OAuth2Client();

// Normaliza el payload del token de Google a nuestra estructura.
function normalizePayload(payload: TokenPayload): NormalizedGoogleProfile {
  return {
    sub: payload.sub as string,
    email: payload.email ?? null,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    givenName: payload.given_name ?? null,
    familyName: payload.family_name ?? null,
    locale: payload.locale ?? null,
    expiresAt: (payload.exp as number) * 1000,
  };
}

// Error personalizado para problemas de verificación de tokens.
export class GoogleTokenVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenVerificationError";
  }
}

// Verifica y decodifica un token de ID de Google, retornando el perfil normalizado.
// Lanza GoogleTokenVerificationError en caso de cualquier problema.
export async function verifyGoogleIdToken(idToken: string, audience?: string): Promise<NormalizedGoogleProfile> {
  // Si se pasa audience, lo usamos; si no, tomamos GOOGLE_CLIENT_ID de entorno.
  // Esto permite tests y usos especiales pasando un audience distinto.
  const expectedAudience = audience || process.env.GOOGLE_CLIENT_ID;
  if (!idToken) {
    throw new GoogleTokenVerificationError("El id_token es obligatorio");
  }
  if (!expectedAudience) {
    throw new GoogleTokenVerificationError("GOOGLE_CLIENT_ID no está configurado");
  }
  // Verificamos el token con la librería oficial de Google.
  // Esta verificación incluye firma, expiración y audiencia.
  const ticket = await oauthClient.verifyIdToken({ idToken, audience: expectedAudience });
  // Extraemos el payload y hacemos validaciones adicionales.
  // La librería ya verifica firma, expiración y audiencia, pero validamos
  // explícitamente el emisor y la presencia de campos clave.
  // Esto es por seguridad y para tener errores más claros.
  const payload = ticket.getPayload();
  if (!payload) {
    throw new GoogleTokenVerificationError("El token de Google no contiene payload");
  }
  if (!payload.sub) {
    throw new GoogleTokenVerificationError("El token de Google no contiene sub");
  }
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new GoogleTokenVerificationError("El token de Google expiró");
  }
  const aud = payload.aud;
  const audiences = (Array.isArray(aud) ? aud : [aud]).filter(Boolean) as string[];
  if (!audiences.includes(expectedAudience)) {
    throw new GoogleTokenVerificationError("Audiencia del token de Google inválida");
  }
  if (!payload.iss || !ALLOWED_ISSUERS.has(payload.iss)) {
    throw new GoogleTokenVerificationError("Emisor del token de Google inválido");
  }

  return normalizePayload(payload);
}