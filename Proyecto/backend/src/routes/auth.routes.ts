import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { User } from "../models/User";

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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6),
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

export default router;