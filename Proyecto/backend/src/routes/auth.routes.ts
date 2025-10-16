import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { User } from "../models/User";
import { sendPasswordResetEmail } from "../services/mailer";

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

/* ── Helper JWT (compat v9) ────────────────────────────────── */
// Tipamos expiresIn en función del propio tipo de SignOptions
type Expires = NonNullable<SignOptions["expiresIn"]>;

function getExpiresIn(): Expires {
  const v = process.env.JWT_EXPIRES;
  if (!v) return "7d" as Expires;              // por defecto
  const n = Number(v);
  return (Number.isFinite(n) ? n : (v as Expires));
}

function signToken(payload: object): string {
  const secretEnv = process.env.JWT_SECRET;
  if (!secretEnv) throw new Error("JWT_SECRET is missing in environment variables");

  const secret: Secret = secretEnv;
  const options: SignOptions = { expiresIn: getExpiresIn() };
  return jwt.sign(payload, secret, options);
}

/* ── POST /auth/register ───────────────────────────────────── */
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password, tdahType } = parsed.data;

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "Email ya registrado" });

  const passwordHash = await argon2.hash(password);
  const user = await User.create({ name, email, passwordHash, tdahType: tdahType ?? null });

  const token = signToken({ sub: user.id, role: user.role });
  return res.status(201).json({ token, user: user.toJSON() });
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
  await user.save();

  const token = signToken({ sub: user.id, role: user.role });
  return res.json({ token, user: user.toJSON() });
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

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = getResetExpiryDate();

  await user.save();

  try {
    const resetUrl = buildResetUrl(rawToken);
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  } catch (error) {
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
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
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }

  user.passwordHash = await argon2.hash(password);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;

  await user.save();

  return res.json({ ok: true });
});

export default router;