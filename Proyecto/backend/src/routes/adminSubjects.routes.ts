import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fsPromises from "fs/promises";
import Subject, { type SubjectDocument } from "../models/Subject";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import {
  extractMultipartFile,
  HttpError,
  type ParsedFile,
} from "./helpers/multipart";

const BANNERS_DIR = path.join(process.cwd(), "uploads", "banners");
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10MB

async function removeStoredBanner(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/banners/")) return;

  const filename = path.basename(url);
  const absolute = path.join(BANNERS_DIR, filename);

  try {
    await fsPromises.unlink(absolute);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.warn(`No se pudo eliminar el banner anterior: ${absolute}`, err);
    }
  }
}

function getExtensionFromMime(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/png") return ".png";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return ".jpg";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/gif") return ".gif";
  return "";
}
async function extractBannerFromRequest(req: Request): Promise<ParsedFile | null> {
  return extractMultipartFile(req, {
    field: "banner",
    maxSize: MAX_BANNER_SIZE,
    allowedMime: /image\/(png|jpeg|jpg|webp|gif)/i,
    tooLargeMessage: "El banner excede el tamaño permitido (10MB)",
  });
}

const router = Router();

function handleError(res: Response, err: any, fallback: string) {
  const message =
    err?.message ??
    err?.response?.data?.error ??
    err?.response?.data?.message ??
    fallback;

  if (err?.name === "ValidationError" || err?.code === 11000) {
    return res.status(422).json({ error: message });
  }

  return res.status(500).json({ error: fallback });
}

function validateObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function findSubjectOr404(id: string, res: Response) {
  let subject: SubjectDocument | null = null;

  if (validateObjectId(id)) {
    subject = await Subject.findById(id);
  }

  if (!subject) {
    subject = await Subject.findOne({ slug: id });
  }

  if (!subject) {
    try {
      subject = await Subject.findOne({ _id: id });
    } catch (err) {
      if (err instanceof mongoose.Error.CastError) {
        subject = null;
      } else {
        throw err;
      }
    }
  }

  if (!subject) {
    res.status(404).json({ error: "Materia no encontrada" });
    return null;
  }

  return subject;
}

// GET /subjects - Listar materias para clientes públicos/autenticados
router.get(
  "/subjects",
  async (_req: Request, res: Response) => {
    try {
      const subjects = await Subject.find()
        .sort({ name: 1 })
        .select("name slug description bannerUrl");

      res.json(subjects);
    } catch (err) {
      handleError(res, err, "Error al obtener materias");
    }
  },
);

// GET /admin/subjects - Listar todas las materias (solo admin)
router.get(
  "/admin/subjects",
  requireAuth,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    try {
      const subjects = await Subject.find().sort({ name: 1 });
      res.json(subjects);
    } catch (err) {
      handleError(res, err, "Error al obtener materias");
    }
  },
);

// POST /admin/subjects - Crear una nueva materia (solo admin)
router.post(
  "/admin/subjects",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { name, slug, description } = req.body ?? {};

      if (!name || !slug) {
        return res
          .status(400)
          .json({ error: "Faltan campos obligatorios: name y slug" });
      }

      const exists = await Subject.findOne({ slug });
      if (exists) {
        return res
          .status(409)
          .json({ error: "Ya existe una materia con ese slug" });
      }

      const subject = await Subject.create({
        name: String(name).trim(),
        slug: String(slug).trim(),
        description: description ? String(description).trim() : undefined,
      });

      res.status(201).json(subject);
    } catch (err) {
      handleError(res, err, "Error al crear materia");
    }
  },
);

// PUT /admin/subjects/:id - Actualizar materia
router.put(
  "/admin/subjects/:id",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subject = await findSubjectOr404(id, res);
      if (!subject) return;

      const { name, slug, description } = req.body ?? {};

      if (slug) {
        const exists = await Subject.findOne({ slug, _id: { $ne: subject._id } });
        if (exists) {
          return res
            .status(409)
            .json({ error: "Ya existe una materia con ese slug" });
        }
        subject.slug = String(slug).trim();
      }

      if (name !== undefined) {
        const trimmed = String(name).trim();
        if (!trimmed) {
          return res.status(400).json({ error: "El nombre no puede estar vacío" });
        }
        subject.name = trimmed;
      }

      if (description !== undefined) {
        const trimmed = String(description).trim();
        subject.description = trimmed.length ? trimmed : undefined;
      }

      await subject.save();
      res.json(subject);
    } catch (err) {
      handleError(res, err, "Error al actualizar materia");
    }
  },
);

// DELETE /admin/subjects/:id - Eliminar materia
router.delete(
  "/admin/subjects/:id",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subject = await findSubjectOr404(id, res);
      if (!subject) return;

      await subject.deleteOne();

      res.status(204).send();
    } catch (err) {
      handleError(res, err, "Error al eliminar materia");
    }
  },
);

// PATCH /admin/subjects/:id/banner - Subir banner (archivo multipart/form-data)
router.patch(
  "/admin/subjects/:id/banner",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subject = await findSubjectOr404(id, res);
      if (!subject) return;

      const banner = await extractBannerFromRequest(req);
      if (!banner) {
        return res.status(400).json({ error: "No se recibió un banner" });
      }

      await removeStoredBanner(subject.bannerUrl ?? null);

      const originalExt = path.extname(banner.filename).toLowerCase();
      const inferredExt = getExtensionFromMime(banner.mimeType);
      const extension = originalExt || inferredExt;
      const uniqueName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}${extension}`;

      await fsPromises.mkdir(BANNERS_DIR, { recursive: true });
      const destination = path.join(BANNERS_DIR, uniqueName);
      await fsPromises.writeFile(destination, banner.buffer);

      subject.bannerUrl = `/uploads/banners/${uniqueName}`;
      await subject.save();

      res.json(subject as SubjectDocument);
    } catch (err) {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      handleError(res, err, "Error al subir banner");
    }
  },
);

// DELETE /admin/subjects/:id/banner - Quitar banner
router.delete(
  "/admin/subjects/:id/banner",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subject = await findSubjectOr404(id, res);
      if (!subject) return;

      await removeStoredBanner(subject.bannerUrl ?? null);
      subject.bannerUrl = null;
      await subject.save();

      res.json(subject as SubjectDocument);
    } catch (err) {
      handleError(res, err, "Error al quitar banner");
    }
  },
);

export default router;
