import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fsPromises from "fs/promises";
import mongoose from "mongoose";
import Subject, { type SubjectDocument } from "../models/Subject";
import Activity from "../models/Activity";
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

function sanitizeBannerUrl(url: unknown) {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  return trimmed;
}

function toISO(value: unknown) {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value as any);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  } catch (err) {
    return null;
  }
}

type SubjectLean = {
  _id: mongoose.Types.ObjectId;
  slug?: string;
  name: string;
  description?: string;
  bannerUrl?: string | null;
  updatedAt?: Date;
};

async function findSubjectLean(identifier: string): Promise<SubjectLean | null> {
  const normalized = identifier.trim().toLowerCase();

  let subject = await Subject.findOne({ slug: normalized })
    .select({ _id: 1, slug: 1, name: 1, description: 1, bannerUrl: 1, updatedAt: 1 })
    .lean<SubjectLean>();

  if (subject) return subject;

  if (validateObjectId(normalized)) {
    subject = await Subject.findById(normalized)
      .select({ _id: 1, slug: 1, name: 1, description: 1, bannerUrl: 1, updatedAt: 1 })
      .lean<SubjectLean>();
    if (subject) return subject;
  }

  return null;
}

function mapSubject(subject: SubjectLean | SubjectDocument) {
  const raw: SubjectLean = ("toObject" in subject
    ? (subject as SubjectDocument).toObject({
        transform: undefined,
      })
    : (subject as SubjectLean)) as SubjectLean;

  const id = raw._id.toString();
  return {
    id,
    _id: id,
    slug: raw.slug ?? "",
    name: raw.name,
    description: raw.description ?? null,
    bannerUrl: sanitizeBannerUrl(raw.bannerUrl),
    updatedAt: toISO(raw.updatedAt),
  };
}

type ActivityLean = {
  _id: mongoose.Types.ObjectId;
  slug?: string;
  title: string;
  bannerUrl?: string | null;
  kind?: string;
  xpReward?: number;
  status?: string;
  updatedAt?: Date;
  subjectId?: mongoose.Types.ObjectId;
  description?: string | null;
  templateType?: string | null;
  config?: Record<string, unknown> | null;
};

function mapActivity(
  activity: ActivityLean,
  subject: SubjectLean | SubjectDocument | null,
  options?: { includeConfig?: boolean },
): Record<string, unknown> {
  const includeConfig = Boolean(options?.includeConfig);
  const subjectId = (activity as any).subjectId ?? (subject as any)?._id;
  const subjectSlug = (subject as any)?.slug ?? null;
  const id = activity._id.toString();
  const config = (activity as any).config ?? null;
  const templateType =
    (activity as any).templateType ??
    (typeof config === "object" && config && "activityType" in config
      ? (config as any).activityType
      : null);

  return {
    id,
    _id: id,
    subjectId: subjectId ? subjectId.toString() : null,
    subjectSlug,
    slug: activity.slug ?? null,
    title: activity.title,
    description: activity.description ?? null,
    bannerUrl: sanitizeBannerUrl(activity.bannerUrl),
    kind: activity.kind ?? null,
    xpReward: activity.xpReward ?? null,
    status: activity.status ?? null,
    updatedAt: toISO(activity.updatedAt),
    estimatedMinutes: null,
    material: null,
    templateType: templateType ?? null,
    config: includeConfig ? (config as Record<string, unknown> | null) ?? null : undefined,
  };
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
        .sort({ updatedAt: -1, createdAt: -1 })
        .select({ _id: 1, slug: 1, name: 1, description: 1, bannerUrl: 1, updatedAt: 1 })
        .lean<SubjectLean[]>();

      const mapped = subjects.map(mapSubject);
      res.set("Cache-Control", "no-store");
      res.json(mapped);
    } catch (err) {
      handleError(res, err, "Error al obtener materias");
    }
  },
);

router.get("/subjects/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const subject = await findSubjectLean(slug);
    if (!subject) {
      return res.status(404).json({ error: "Materia no encontrada" });
    }

    res.set("Cache-Control", "no-store");
    res.json(mapSubject(subject));
  } catch (err) {
    handleError(res, err, "Error al obtener materia");
  }
});

router.get("/subjects/:slug/activities", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const subject = await findSubjectLean(slug);
    if (!subject) {
      return res.status(404).json({ error: "Materia no encontrada" });
    }

    const activities = await Activity.find({ subjectId: subject._id, status: "published" })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select({
        _id: 1,
        slug: 1,
        title: 1,
        description: 1,
        bannerUrl: 1,
        kind: 1,
        xpReward: 1,
        status: 1,
        updatedAt: 1,
        subjectId: 1,
        templateType: 1,
      })
      .lean<ActivityLean[]>();

    const mapped = activities.map((activity) => mapActivity(activity, subject));
    res.set("Cache-Control", "no-store");
    res.json(mapped);
  } catch (err) {
    handleError(res, err, "Error al obtener actividades");
  }
});

router.get("/activities/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let activity = null;

    if (validateObjectId(id)) {
      activity = await Activity.findById(id)
        .select({
          _id: 1,
          slug: 1,
          title: 1,
          description: 1,
          bannerUrl: 1,
          kind: 1,
          xpReward: 1,
          status: 1,
          updatedAt: 1,
          subjectId: 1,
          templateType: 1,
          config: 1,
        })
        .lean<ActivityLean & { subjectId?: mongoose.Types.ObjectId }>();
    }

    if (!activity) {
      activity = await Activity.findOne({ slug: id })
        .select({
          _id: 1,
          slug: 1,
          title: 1,
          description: 1,
          bannerUrl: 1,
          kind: 1,
          xpReward: 1,
          status: 1,
          updatedAt: 1,
          subjectId: 1,
          templateType: 1,
          config: 1,
        })
        .lean<ActivityLean & { subjectId?: mongoose.Types.ObjectId }>();
    }

    if (!activity) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    let subject: SubjectLean | null = null;
    if (activity.subjectId) {
      subject = await Subject.findById(activity.subjectId)
        .select({ _id: 1, slug: 1, name: 1, description: 1, bannerUrl: 1, updatedAt: 1 })
        .lean<SubjectLean>();
    }

    res.json(mapActivity(activity, subject, { includeConfig: true }));
  } catch (err) {
    handleError(res, err, "Error al obtener actividad");
  }
});

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
