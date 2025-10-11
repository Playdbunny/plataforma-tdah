import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { User } from "../models/User";

const router = Router();

const characterSchema = z
  .object({
    id: z.string().min(1, "ID de personaje requerido"),
    name: z.string().min(1, "Nombre de personaje requerido"),
    sprite: z.string().min(1, "Sprite de personaje requerido"),
  })
  .strict();

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    username: z.string().trim().min(3).max(100).optional(),
    avatarUrl: z.string().trim().min(1).optional(),
    education: z.string().trim().min(2).max(200).optional(),
    character: characterSchema.nullable().optional(),
    ownedCharacters: z.array(z.string().min(1)).optional(),
    coins: z.number().int().min(0).optional(),
  })
  .strict();

router.use(requireAuth);

router.patch("/", async (req: any, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = req.auth.sub;
  const updates = parsed.data;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  if (updates.email && updates.email !== user.email) {
    const existingEmail = await User.findOne({ email: updates.email, _id: { $ne: userId } });
    if (existingEmail) {
      return res.status(409).json({ error: "El correo ya está en uso" });
    }
    user.email = updates.email.toLowerCase();
  }

  if (updates.username) {
    const username = updates.username.trim();
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUsername) {
        return res.status(409).json({ error: "El nombre de usuario no está disponible" });
      }
      user.username = username;
    }
  }

  if (typeof updates.name === "string") {
    user.name = updates.name.trim();
  }

  if (typeof updates.avatarUrl === "string") {
    user.avatarUrl = updates.avatarUrl.trim();
  }

  if (typeof updates.education === "string") {
    const value = updates.education.trim();
    user.education = value || null;
  }

  if (updates.character !== undefined) {
    user.character = updates.character ?? null;
  }

  if (Array.isArray(updates.ownedCharacters)) {
    user.ownedCharacters = Array.from(new Set(updates.ownedCharacters.map((c) => c.trim()).filter(Boolean)));
  }

  if (typeof updates.coins === "number") {
    user.coins = updates.coins;
  }

  await user.save();

  return res.json({ user: user.toJSON() });
});

export default router;
