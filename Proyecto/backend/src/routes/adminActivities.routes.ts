import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import fsPromises from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import Activity, { type ActivityAttrs } from "../models/Activity";
import Subject, { type SubjectDocument } from "../models/Subject";
import { requireAuth, requireRole, type AuthPayload } from "../middleware/requireAuth";
import { normalizeBannerUrl } from "../lib/normalizeBannerUrl";
import {
  HttpError,
  readRequestBuffer,
  type ParsedFile,
} from "./helpers/multipart";

const BANNERS_DIR = path.join(process.cwd(), "uploads", "banners");
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10MB
const BANNER_MIME_REGEX = /image\/(png|jpeg|jpg|webp|gif)/i;

type UploadedBannerFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

function getExtensionFromMime(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/png") return ".png";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return ".jpg";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/gif") return ".gif";
  return "";
}
async function saveBannerFile(file: ParsedFile): Promise<UploadedBannerFile> {
  if (!BANNER_MIME_REGEX.test(file.mimeType)) {
    throw new HttpError(415, "Formato de banner no soportado. Usa PNG, JPG, WEBP o GIF.");
  }
  if (file.buffer.length > MAX_BANNER_SIZE) {
    throw new HttpError(413, "El banner excede el tamaño permitido (10MB).");
  }

  await fsPromises.mkdir(BANNERS_DIR, { recursive: true });
  const originalExt = path.extname(file.filename).toLowerCase();
  const inferredExt = getExtensionFromMime(file.mimeType);
  const extension = originalExt || inferredExt || ".png";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const destination = path.join(BANNERS_DIR, uniqueName);
  await fsPromises.writeFile(destination, file.buffer);

  return {
    filename: uniqueName,
    originalname: file.filename,
    mimetype: file.mimeType,
    size: file.buffer.length,
    path: `/uploads/banners/${uniqueName}`,
  };
}

async function parseMultipartForm(req: Request): Promise<{
  fields: Record<string, string>;
  file?: ParsedFile;
}> {
  const contentType = req.headers["content-type"];
  if (typeof contentType !== "string" || !/multipart\/form-data/i.test(contentType)) {
    throw new HttpError(415, "Se esperaba multipart/form-data");
  }

  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new HttpError(400, "Cabeceras multipart/form-data inválidas");
  }

  const boundary = boundaryMatch[1];
  const bodyBuffer = await readRequestBuffer(
    req,
    MAX_BANNER_SIZE + 2 * 1024 * 1024,
    "El banner excede el tamaño permitido (10MB)",
  );
  const boundaryMarker = `--${boundary}`;
  const parts = bodyBuffer.toString("binary").split(boundaryMarker);

  const fields: Record<string, string> = {};
  let file: ParsedFile | undefined;

  for (const rawPart of parts) {
    if (!rawPart || rawPart === "--" || rawPart === "--\r\n") continue;

    let part = rawPart;
    if (part.startsWith("\r\n")) {
      part = part.slice(2);
    }
    if (!part.trim()) continue;
    if (part.startsWith("--")) break;

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerSection = part.slice(0, headerEnd);
    let bodySection = part.slice(headerEnd + 4);

    if (bodySection.endsWith("\r\n")) {
      bodySection = bodySection.slice(0, -2);
    }

    const headers = headerSection.split("\r\n");
    const dispositionHeader = headers.find((h) => /^content-disposition:/i.test(h));
    if (!dispositionHeader) continue;

    const nameMatch = dispositionHeader.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];

    const filenameMatch = dispositionHeader.match(/filename="([^"]*)"/i);
    if (filenameMatch && filenameMatch[1]) {
      const filename = filenameMatch[1];
      const typeHeader = headers.find((h) => /^content-type:/i.test(h));
      const mimeType = typeHeader?.split(":")[1]?.trim() ?? "application/octet-stream";
      const bufferData = Buffer.from(bodySection, "binary");

      if (fieldName === "banner" && bufferData.length > 0) {
        file = {
          filename,
          mimeType,
          buffer: bufferData,
        };
      }
    } else {
      const value = Buffer.from(bodySection, "binary").toString("utf8");
      fields[fieldName] = value;
    }
  }

  return { fields, file };
}

function bannerUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"] ?? "";
  if (typeof contentType !== "string" || !/multipart\/form-data/i.test(contentType)) {
    return next();
  }

  parseMultipartForm(req)
    .then(async ({ fields, file }) => {
      req.body = fields;
      if (file) {
        const stored = await saveBannerFile(file);
        req.file = stored;
      } else {
        req.file = null;
      }
      next();
    })
    .catch((err) => {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      const message = err instanceof Error ? err.message : "No se pudo procesar el banner.";
      return res.status(400).json({ error: message });
    });
}

async function removeStoredBanner(url: string | null | undefined) {
  if (!url || typeof url !== "string" || !url.startsWith("/uploads/banners/")) return;
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

function isLocalBanner(url: string | null | undefined) {
  return typeof url === "string" && url.startsWith("/uploads/banners/");
}

function parseActivityJson(
  value: unknown,
  field: "fieldsJSON" | "config",
): Record<string, unknown> | undefined {
  if (value == null) return undefined;
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as Record<string, unknown>;
  } catch (error) {
    const err: any = new Error(`Formato JSON inválido para ${field}`);
    err.status = 400;
    throw err;
  }
}

// Extiende la interfaz Request para incluir user con role
declare global {
  namespace Express {
    interface User {
      role: string;
      // otros campos si es necesario
    }
    interface Request {
      user?: User;
      auth?: AuthPayload;
      file?: UploadedBannerFile | null;
    }
  }
}

const router = Router();

const VALID_STATUSES = new Set(["draft", "published"]);

function normalizeStatus(status: unknown) {
  if (typeof status !== "string") return undefined;
  const trimmed = status.trim().toLowerCase();
  return VALID_STATUSES.has(trimmed) ? (trimmed as "draft" | "published") : undefined;
}

async function resolveSubject(
  subjectId?: unknown,
  subjectSlug?: unknown,
): Promise<SubjectDocument | null> {
  if (typeof subjectId === "string" && mongoose.Types.ObjectId.isValid(subjectId)) {
    const subject = await Subject.findById(subjectId);
    if (subject) return subject;
  }

  if (typeof subjectSlug === "string" && subjectSlug.trim()) {
    const subject = await Subject.findOne({ slug: subjectSlug.trim().toLowerCase() });
    if (subject) return subject;
  }

  return null;
}

async function touchSubject(subjectId: mongoose.Types.ObjectId | string | null | undefined) {
  if (!subjectId) return;
  const id =
    typeof subjectId === "string" && mongoose.Types.ObjectId.isValid(subjectId)
      ? subjectId
      : subjectId instanceof mongoose.Types.ObjectId
      ? subjectId
      : null;

  if (!id) return;

  await Subject.updateOne({ _id: id }, { $set: { updatedAt: new Date() } }).catch((err) => {
    console.warn("[activities] No se pudo actualizar updatedAt de la materia", err);
  });
}

// Centralizado manejo de errores
function handleError(res: Response, err: any) {
  if (typeof err?.status === "number") {
    return res
      .status(err.status)
      .json({ error: err.message ?? "Solicitud inválida." });
  }
  if (err?.name === "ValidationError" || err?.code === 11000) {
    return res.status(422).json({ error: err.message });
  }
  return res.status(500).json({ error: "Error interno del servidor." });
}

// CREATE
router.post(
  "/admin/activities",
  requireAuth,
  requireRole("admin"),
  bannerUploadMiddleware,
  async (req: Request, res: Response) => {
  try {
    const rawBody = (req.body ?? {}) as Record<string, unknown>;
    const { subjectId, subjectSlug } = rawBody;

    const subject = await resolveSubject(subjectId, subjectSlug);

    if (!subject) {
      return res.status(404).json({
        error: "Materia no encontrada para asociar la actividad.",
      });
    }

    const createdBy = req.auth?.sub;
    if (!createdBy) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    const status = normalizeStatus(
      (rawBody?.status as unknown) ??
        ((rawBody?.isPublished as unknown) ? "published" : undefined),
    );

    const subjectObjectId = subject._id as mongoose.Types.ObjectId;

    const payload: Record<string, unknown> = {
      ...rawBody,
      subjectId: subjectObjectId,
      createdBy,
    };

    const requestedTemplate =
      typeof rawBody?.templateType === "string"
        ? rawBody.templateType
        : typeof rawBody?.type === "string"
        ? rawBody.type
        : null;

    if (requestedTemplate) {
      payload.templateType = String(requestedTemplate).trim().toLowerCase();
    }

    if (status) {
      payload.status = status;
    } else {
      delete payload.status;
    }
    delete payload.isPublished;

    if (req.file) {
      payload.bannerUrl = req.file.path;
    } else if (Object.prototype.hasOwnProperty.call(rawBody, "bannerUrl")) {
      const normalizedBanner = normalizeBannerUrl(
        typeof rawBody.bannerUrl === "string" ? rawBody.bannerUrl : null,
      );
      payload.bannerUrl = normalizedBanner;
    } else {
      payload.bannerUrl = null;
    }

    const parsedFields = parseActivityJson(rawBody.fieldsJSON, "fieldsJSON");
    payload.fieldsJSON = parsedFields ?? {};
    const parsedConfig = parseActivityJson(rawBody.config, "config");
    payload.config = parsedConfig ?? {};

    const activity = new Activity(payload as Partial<ActivityAttrs>);
    await activity.save();
    await touchSubject(subjectObjectId);
    res.status(201).json(activity);
  } catch (err) {
    if (req.file?.path) {
      await removeStoredBanner(req.file.path);
    }
    handleError(res, err);
  }
},
);

// READ
router.get("/admin/activities", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const activities = await Activity.find();
    res.json(activities);
  } catch (err) {
    handleError(res, err);
  }
});

// UPDATE
router.put(
  "/admin/activities/:id",
  requireAuth,
  requireRole("admin"),
  bannerUploadMiddleware,
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await Activity.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Actividad no encontrada." });
    }

    const rawBody = (req.body ?? {}) as Record<string, unknown>;
    let nextSubjectId = existing.subjectId;
    if (rawBody?.subjectId || rawBody?.subjectSlug) {
      const subject = await resolveSubject(rawBody?.subjectId, rawBody?.subjectSlug);
      if (!subject) {
        return res.status(404).json({ error: "Materia no encontrada para asociar la actividad." });
      }
      const subjectObjectId = subject._id as mongoose.Types.ObjectId;
      nextSubjectId = subjectObjectId;
      existing.subjectId = subjectObjectId;
    }

    const status = normalizeStatus(
      (rawBody?.status as unknown) ??
        ((rawBody?.isPublished as unknown) ? "published" : undefined),
    );

    const updatable: Record<string, unknown> = {
      ...rawBody,
      subjectId: nextSubjectId,
    };

    const requestedTemplate =
      typeof rawBody?.templateType === "string"
        ? rawBody.templateType
        : typeof rawBody?.type === "string"
        ? rawBody.type
        : null;

    if (requestedTemplate) {
      updatable.templateType = String(requestedTemplate).trim().toLowerCase();
    }

    if (status) {
      updatable.status = status;
    } else {
      delete updatable.status;
    }
    delete updatable.isPublished;

    let bannerToRemove: string | null = null;
    const previousBanner = existing.bannerUrl ?? null;
    delete updatable.bannerUrl;
    if (req.file) {
      updatable.bannerUrl = req.file.path;
      if (isLocalBanner(previousBanner)) {
        bannerToRemove = previousBanner;
      }
    } else if (Object.prototype.hasOwnProperty.call(rawBody, "bannerUrl")) {
      const normalizedBanner = normalizeBannerUrl(
        typeof rawBody.bannerUrl === "string" ? rawBody.bannerUrl : null,
      );
      updatable.bannerUrl = normalizedBanner;
      if (!normalizedBanner && isLocalBanner(previousBanner)) {
        bannerToRemove = previousBanner;
      } else if (
        normalizedBanner &&
        normalizedBanner !== previousBanner &&
        isLocalBanner(previousBanner)
      ) {
        bannerToRemove = previousBanner;
      }
    }

    if (Object.prototype.hasOwnProperty.call(rawBody, "fieldsJSON")) {
      const parsedFields = parseActivityJson(rawBody.fieldsJSON, "fieldsJSON");
      updatable.fieldsJSON = parsedFields ?? {};
    } else {
      delete updatable.fieldsJSON;
    }

    if (Object.prototype.hasOwnProperty.call(rawBody, "config")) {
      const parsedConfig = parseActivityJson(rawBody.config, "config");
      updatable.config = parsedConfig ?? {};
    } else {
      delete updatable.config;
    }

    existing.set(updatable as Partial<ActivityAttrs>);
    const updated = await existing.save();
    await touchSubject(nextSubjectId);
    if (bannerToRemove) {
      await removeStoredBanner(bannerToRemove);
    }
    res.json(updated);
  } catch (err) {
    if (req.file?.path) {
      await removeStoredBanner(req.file.path);
    }
    handleError(res, err);
  }
},
);

// DELETE
router.delete("/admin/activities/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ error: "Actividad no encontrada." });
    await removeStoredBanner(activity.bannerUrl ?? null);
    await touchSubject(activity.subjectId);
    res.json({ message: "Actividad eliminada." });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
