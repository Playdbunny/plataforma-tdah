import { Router } from "express";
import argon2 from "argon2";
import { User } from "../models/User";
import { requireAuth, requireRole } from "../middleware/requireAuth";

const router = Router();

/**
 * POST /admin/create
 * Solo un usuario con rol "admin" puede crear otros admins
 */
router.post("/create", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "Email ya registrado" });

  const passwordHash = await argon2.hash(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "admin",  // ← este sí se crea como admin
  });

  return res.status(201).json({ message: "Admin creado", user: user.toJSON() });
});

export default router;