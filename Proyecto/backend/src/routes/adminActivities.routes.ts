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
const VIDEOS_DIR = path.join(process.cwd(), "uploads", "videos");
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB
const FORM_BUFFER_LIMIT = MAX_BANNER_SIZE + MAX_VIDEO_SIZE + 2 * 1024 * 1024;
const BANNER_MIME_REGEX = /image\/(png|jpeg|jpg|webp|gif)/i;
const VIDEO_MIME_REGEX = /^video\//i;

type UploadedBannerFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

type UploadedVideoFile = {
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

function getVideoExtensionFromMime(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized === "video/mp4" || normalized === "video/mpeg" || normalized === "video/x-m4v") {
    return ".mp4";
  }
  if (normalized === "video/quicktime") return ".mov";
  if (normalized === "video/webm") return ".webm";
  if (normalized === "video/x-matroska") return ".mkv";
  if (normalized === "video/ogg") return ".ogv";
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

async function saveVideoFile(file: ParsedFile): Promise<UploadedVideoFile> {
  if (!VIDEO_MIME_REGEX.test(file.mimeType)) {
    throw new HttpError(415, "Formato de video no soportado. Sube un archivo de video válido.");
  }
  if (file.buffer.length > MAX_VIDEO_SIZE) {
    throw new HttpError(413, "El video excede el tamaño permitido (20MB).");
  }

  await fsPromises.mkdir(VIDEOS_DIR, { recursive: true });
  const originalExt = path.extname(file.filename).toLowerCase();
  const inferredExt = getVideoExtensionFromMime(file.mimeType);
  const extension = originalExt || inferredExt || ".mp4";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const destination = path.join(VIDEOS_DIR, uniqueName);
  await fsPromises.writeFile(destination, file.buffer);

  return {
    filename: uniqueName,
    originalname: file.filename,
    mimetype: file.mimeType,
    size: file.buffer.length,
    path: `/uploads/videos/${uniqueName}`,
  };
}

async function parseMultipartForm(req: Request): Promise<{
  fields: Record<string, string>;
  banner?: ParsedFile;
  video?: ParsedFile;
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
    FORM_BUFFER_LIMIT,
    "El archivo enviado excede el tamaño permitido (20MB)",
  );
  const boundaryMarker = `--${boundary}`;
  const parts = bodyBuffer.toString("binary").split(boundaryMarker);

  const fields: Record<string, string> = {};
  let banner: ParsedFile | undefined;
  let video: ParsedFile | undefined;

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
        banner = {
          filename,
          mimeType,
          buffer: bufferData,
        };
      } else if (fieldName === "video" && bufferData.length > 0) {
        video = {
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

  return { fields, banner, video };
}

function bannerUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"] ?? "";
  if (typeof contentType !== "string" || !/multipart\/form-data/i.test(contentType)) {
    return next();
  }

  (async () => {
    const { fields, banner, video } = await parseMultipartForm(req);
    req.body = fields;

    let storedBanner: UploadedBannerFile | null = null;
    let storedVideo: UploadedVideoFile | null = null;

    try {
      if (banner) {
        storedBanner = await saveBannerFile(banner);
      }
      if (video) {
        storedVideo = await saveVideoFile(video);
      }

      req.file = storedBanner ?? null;
      (req as Request & { videoFile?: UploadedVideoFile | null }).videoFile = storedVideo ?? null;
      next();
    } catch (error) {
      if (storedBanner) {
        await removeStoredBanner(storedBanner.path);
      }
      if (storedVideo) {
        await removeStoredVideo(storedVideo.path);
      }
      throw error;
    }
  })().catch((err) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    const message = err instanceof Error ? err.message : "No se pudo procesar el archivo adjunto.";
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

async function removeStoredVideo(url: string | null | undefined) {
  if (!url || typeof url !== "string" || !url.startsWith("/uploads/videos/")) return;
  const filename = path.basename(url);
  const absolute = path.join(VIDEOS_DIR, filename);
  try {
    await fsPromises.unlink(absolute);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.warn(`No se pudo eliminar el recurso anterior: ${absolute}`, err);
    }
  }
}

function isLocalBanner(url: string | null | undefined) {
  return typeof url === "string" && url.startsWith("/uploads/banners/");
}

function stripDataUrlFields(target: Record<string, any> | null | undefined) {
  if (!target || typeof target !== "object") return;
  if (typeof target.fileUrl === "string" && /^data:/i.test(target.fileUrl)) {
    target.fileUrl = null;
  }

  const asset = target.asset;
  if (asset && typeof asset === "object") {
    if (typeof asset.url === "string" && /^data:/i.test(asset.url)) {
      asset.url = null;
    }
    if (typeof asset.fileUrl === "string" && /^data:/i.test(asset.fileUrl)) {
      asset.fileUrl = null;
    }
    if (typeof asset.dataUrl === "string") {
      delete asset.dataUrl;
    }
  }
}

function applyUploadedResource(
  target: Record<string, any> | null | undefined,
  resourcePath: string,
): Record<string, any> {
  const base = target && typeof target === "object" ? target : {};
  base.fileUrl = resourcePath;

  const asset =
    base.asset && typeof base.asset === "object"
      ? (base.asset as Record<string, any>)
      : {};

  asset.url = resourcePath;
  asset.source = typeof asset.source === "string" ? asset.source : "upload";
  if (typeof asset.type !== "string" || !asset.type) {
    asset.type = "video";
  }
  delete asset.dataUrl;
  delete asset.fileUrl;

  base.asset = asset;

  return base;
}

function resolveLocalResourcePath(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, any>;

  const candidates: unknown[] = [];
  if (typeof source.fileUrl === "string") {
    candidates.push(source.fileUrl);
  }

  const asset = source.asset;
  if (asset && typeof asset === "object") {
    const assetRecord = asset as Record<string, any>;
    if (typeof assetRecord.url === "string") {
      candidates.push(assetRecord.url);
    }
    if (typeof assetRecord.fileUrl === "string") {
      candidates.push(assetRecord.fileUrl);
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("/uploads/videos/")) {
      return candidate;
    }
  }

  return null;
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
      videoFile?: UploadedVideoFile | null;
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
    const fieldsJSON = (parsedFields ?? {}) as Record<string, any>;
    stripDataUrlFields(fieldsJSON);
    const parsedConfig = parseActivityJson(rawBody.config, "config");
    const config = (parsedConfig ?? {}) as Record<string, any>;
    stripDataUrlFields(config);

    if (req.videoFile) {
      const videoPath = req.videoFile.path;
      payload.fieldsJSON = applyUploadedResource(fieldsJSON, videoPath);
      payload.config = applyUploadedResource(config, videoPath);
    } else {
      payload.fieldsJSON = fieldsJSON;
      payload.config = config;
    }

    const activity = new Activity(payload as Partial<ActivityAttrs>);
    await activity.save();
    await touchSubject(subjectObjectId);
    res.status(201).json(activity);
  } catch (err) {
    if (req.file?.path) {
      await removeStoredBanner(req.file.path);
    }
    if (req.videoFile?.path) {
      await removeStoredVideo(req.videoFile.path);
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
    const previousVideo = resolveLocalResourcePath(existing.config);
    let videoToRemove: string | null = null;

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

    let nextFields: Record<string, any> | undefined;
    if (Object.prototype.hasOwnProperty.call(rawBody, "fieldsJSON")) {
      const parsedFields = parseActivityJson(rawBody.fieldsJSON, "fieldsJSON");
      nextFields = (parsedFields ?? {}) as Record<string, any>;
      stripDataUrlFields(nextFields);
    } else if (req.videoFile) {
      const currentFields = (existing as any).fieldsJSON;
      if (currentFields && typeof currentFields === "object") {
        nextFields = { ...(currentFields as Record<string, any>) };
      } else {
        nextFields = {};
      }
      stripDataUrlFields(nextFields);
    } else {
      delete updatable.fieldsJSON;
    }

    let nextConfig: Record<string, any> | undefined;
    if (Object.prototype.hasOwnProperty.call(rawBody, "config")) {
      const parsedConfig = parseActivityJson(rawBody.config, "config");
      nextConfig = (parsedConfig ?? {}) as Record<string, any>;
      stripDataUrlFields(nextConfig);
    } else if (req.videoFile) {
      const currentConfig = existing.config;
      if (currentConfig && typeof currentConfig === "object") {
        nextConfig = { ...(currentConfig as Record<string, any>) };
      } else {
        nextConfig = {};
      }
      stripDataUrlFields(nextConfig);
    } else {
      delete updatable.config;
    }

    if (req.videoFile) {
      const videoPath = req.videoFile.path;
      nextFields = applyUploadedResource(nextFields ?? {}, videoPath);
      nextConfig = applyUploadedResource(nextConfig ?? {}, videoPath);
      updatable.fieldsJSON = nextFields;
      updatable.config = nextConfig;
      if (previousVideo && previousVideo !== videoPath) {
        videoToRemove = previousVideo;
      }
    } else {
      if (nextFields) {
        updatable.fieldsJSON = nextFields;
      }
      if (nextConfig) {
        updatable.config = nextConfig;
        const nextResourcePath = resolveLocalResourcePath(nextConfig);
        if (!nextResourcePath && previousVideo) {
          videoToRemove = previousVideo;
        } else if (
          nextResourcePath &&
          previousVideo &&
          previousVideo !== nextResourcePath &&
          previousVideo.startsWith("/uploads/videos/")
        ) {
          videoToRemove = previousVideo;
        }
      } else if (previousVideo && Object.prototype.hasOwnProperty.call(rawBody, "config")) {
        videoToRemove = previousVideo;
      }
    }

    existing.set(updatable as Partial<ActivityAttrs>);
    const updated = await existing.save();
    await touchSubject(nextSubjectId);
    if (bannerToRemove) {
      await removeStoredBanner(bannerToRemove);
    }
    if (videoToRemove) {
      await removeStoredVideo(videoToRemove);
    }
    res.json(updated);
  } catch (err) {
    if (req.file?.path) {
      await removeStoredBanner(req.file.path);
    }
    if (req.videoFile?.path) {
      await removeStoredVideo(req.videoFile.path);
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
