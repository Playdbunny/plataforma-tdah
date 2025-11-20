import { Router } from "express";
import { z } from "zod";
import path from "path";
import fsPromises from "fs/promises";
import { requireAuth } from "../middleware/requireAuth";
import {
  MAX_AVATAR_URL_LENGTH,
  User,
  normalizeAvatarUrl,
} from "../models/User";

const isRemoteHttpUrl = (url: string | null | undefined): url is string =>
  typeof url === "string" && /^https?:\/\//i.test(url);

async function removeStoredAvatar(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/avatars/")) return;

  const filename = path.basename(url);
  const absolute = path.join(process.cwd(), "uploads", "avatars", filename);

  try {
    await fsPromises.unlink(absolute);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.warn(`No se pudo eliminar el avatar anterior: ${absolute}`, err);
    }
  }
}

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
    avatarUrl: z
      .union([
        z
          .string()
          .trim()
          .min(1)
          .max(MAX_AVATAR_URL_LENGTH)
          .refine((value) => {
            const normalized = normalizeAvatarUrl(value);
            return Boolean(normalized && isRemoteHttpUrl(normalized));
          }, {
            message: "avatarUrl debe ser una URL http(s) válida",
          }),
        z.literal(null),
      ])
      .optional(),
    education: z.string().trim().min(2).max(200).optional(),
    character: characterSchema.nullable().optional(),
    ownedCharacters: z.array(z.string().min(1)).optional(),
    coins: z.number().int().min(0).optional(),
  })
  .strict();

router.use(requireAuth);

/**
 * POST /profile/avatar
 * Ahora SOLO recibe { avatarUrl } en el body (URL ya subida a GCS)
 * Se mantiene para compatibilidad como un “atajo” de actualización de avatar.
 */
router.post("/avatar", async (req: any, res) => {
  try {
    const userId = req.auth.sub;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const rawAvatarUrl = (req.body ?? {}).avatarUrl as unknown;

    if (rawAvatarUrl === undefined) {
      return res.status(400).json({ error: "avatarUrl es requerido" });
    }

    const previousUrl = user.avatarUrl ?? null;

    if (rawAvatarUrl === null) {
      // quitar avatar
      user.avatarUrl = null;
    } else if (typeof rawAvatarUrl === "string") {
      const normalized = normalizeAvatarUrl(rawAvatarUrl);
      if (!normalized || !isRemoteHttpUrl(normalized)) {
        return res.status(400).json({ error: "avatarUrl debe ser una URL http(s) válida" });
      }
      user.avatarUrl = normalized;
    } else {
      return res.status(400).json({ error: "avatarUrl inválido" });
    }

    await user.save();

    // limpiar avatar local viejo si existía y cambió
    if (
      previousUrl &&
      previousUrl !== user.avatarUrl &&
      previousUrl.startsWith("/uploads/avatars/")
    ) {
      await removeStoredAvatar(previousUrl);
    }

    return res.json({ avatarUrl: user.avatarUrl });
  } catch (error) {
    console.error("Error al actualizar avatar", error);
    return res
      .status(500)
      .json({ error: "No se pudo actualizar el avatar" });
  }
});

/**
 * PATCH /profile
 * Sigue siendo el endpoint general de perfil,
 * pero ahora también limpia avatares locales si cambia el avatarUrl.
 */
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

  const previousAvatarUrl = user.avatarUrl ?? null;

  if (updates.email && updates.email !== user.email) {
    const existingEmail = await User.findOne({ 
      email: updates.email, 
      _id: { $ne: userId }, 
    });
    if (existingEmail) {
      return res.status(409).json({ error: "El correo ya está en uso" });
    }
    user.email = updates.email.toLowerCase();
  }

  if (typeof updates.username === "string") {
    const username = updates.username.trim();
    if (!username) {
      return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
    }

    const currentUsername = typeof user.username === "string" ? user.username.trim() : null;
    if (!currentUsername || username !== currentUsername) {
      const existingUsername = await User.findOne({ 
        username, 
        _id: { $ne: userId },
      });
      if (existingUsername) {
        return res.status(409).json({ error: "El nombre de usuario no está disponible" });
      }
    }
  
    user.username = username;
  }

  if (typeof updates.name === "string") {
    user.name = updates.name.trim();
  }

  if (updates.avatarUrl === null) {
    user.avatarUrl = null;
  } else if (typeof updates.avatarUrl === "string") {
    const normalized = normalizeAvatarUrl(updates.avatarUrl);
    if (!normalized || !isRemoteHttpUrl(normalized)) {
      return res.status(400).json({ error: "avatarUrl debe ser una URL http(s) válida" });
    }
    user.avatarUrl = normalized;
  }

  if (typeof updates.education === "string") {
    const value = updates.education.trim();
    user.education = value || null;
  }

  if (updates.character !== undefined) {
    user.character = updates.character ?? null;
  }

  if (Array.isArray(updates.ownedCharacters)) {
    user.ownedCharacters = Array.from(
      new Set(
        updates.ownedCharacters.map((c) => c.trim()).filter(Boolean),
      ),
    );
  }

  if (typeof updates.coins === "number") {
    user.coins = updates.coins;
  }

  await user.save();

  // si se cambió el avatar y el anterior era local, intentar borrarlo
  if (
    previousAvatarUrl &&
    previousAvatarUrl !== user.avatarUrl &&
    previousAvatarUrl.startsWith("/uploads/avatars/")
  ) {
    await removeStoredAvatar(previousAvatarUrl);
  }

  return res.json({ user: user.toJSON() });
});

export default router;
