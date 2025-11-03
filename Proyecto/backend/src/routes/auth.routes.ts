import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import { randomBytes, createHash } from "crypto";
import { User } from "../models/User";
import { sendPasswordResetEmail } from "../services/mailer";
import { requireAuth } from "../middleware/requireAuth";
import {
  clearRefreshTokenCookies,
  readRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "./helpers/authCookies";
import { hashRefreshToken, issueSession, revokeSession } from "./helpers/session";

const router = Router();

/* ── Zod schemas ───────────────────────────────────────────── */
const tdahEnum = z.enum(["inatento", "hiperactivo", "combinado"]);

const registerSchema = z
  .object({
    name: z.string().min(2, "Nombre muy corto"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
    tdahType: tdahEnum.nullable().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

// Login y registro usan el mismo esquema
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6),
});

// Esquema para solicitar reseteo de password
const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

// Esquema para resetear el password usando el token enviado por email
const resetSchema = z.object({
  token: z.string().min(10, "Token inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

/* ── POST /auth/register ───────────────────────────────────── */
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password, tdahType } = parsed.data;

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "Email ya registrado" });

  const passwordHash = await argon2.hash(password);
  const user = await User.create({ name, email, passwordHash, tdahType: tdahType ?? null });

  const session = await issueSession(user);
  setRefreshTokenCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  return res.status(201).json(session);
});

/* ── POST /auth/login ──────────────────────────────────────── */
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const ok = await user.verifyPassword(password);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  user.lastLogin = new Date();

  const session = await issueSession(user);
  setRefreshTokenCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  return res.json(session);
});

/* ── POST /auth/forgot-password ────────────────────────────── */
function getResetExpiryDate(): Date {
  const minutesEnv = process.env.PASSWORD_RESET_TOKEN_MINUTES;
  const minutes = minutesEnv ? Number(minutesEnv) : 60;
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
  return new Date(Date.now() + safeMinutes * 60_000);
}

function buildResetUrl(token: string): string {
  const baseEnv = process.env.FRONTEND_URL || "http://localhost:5173";
  const base = baseEnv.replace(/\/$/, "");
  return `${base}/reset/${token}`;
}

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email } = parsed.data;
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ ok: true });
  }

  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  user.passwordResetTokenHash = hashedToken;
  user.passwordResetExpiresAt = getResetExpiryDate();

  await user.save();

  try {
    const resetUrl = buildResetUrl(rawToken);
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  } catch (error) {
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    console.error("Error enviando correo de recuperación", error);
    return res.status(500).json({ error: "No se pudo enviar el correo de recuperación" });
  }

  return res.json({ ok: true });
});

/* ── POST /auth/reset-password ─────────────────────────────── */
router.post("/reset-password", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { token, password } = parsed.data;

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetTokenHash: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }

  user.passwordHash = await argon2.hash(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;

  await user.save();

  return res.json({ ok: true });
});

/* ── POST /auth/refresh ────────────────────────────────────── */
const refreshSchema = z.object({
  refreshToken: z.string().min(10, "Token de refresco inválido").optional(),
});

router.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const providedToken = parsed.data.refreshToken ?? readRefreshTokenFromRequest(req);
  if (!providedToken) {
    clearRefreshTokenCookies(res);
    return res.status(401).json({ error: "Token de refresco inválido o expirado" });
  }

  const hashedToken = hashRefreshToken(providedToken);
  const user = await User.findOne({
    refreshTokenHash: hashedToken,
    refreshTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    clearRefreshTokenCookies(res);
    return res.status(401).json({ error: "Token de refresco inválido o expirado" });
  }

  const session = await issueSession(user);
  setRefreshTokenCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  return res.json(session);
});

router.post("/logout", requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth.sub;
    const user = await User.findById(userId);
    if (user) {
      await revokeSession(user);
    }
  } catch (error) {
    console.error("Error al cerrar sesión", error);
  } finally {
    clearRefreshTokenCookies(res);
  }

  return res.status(204).send();
});

export default router;
