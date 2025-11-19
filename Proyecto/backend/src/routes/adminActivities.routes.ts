import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import fsPromises from "fs/promises";
import mongoose from "mongoose";
import path from "path";

import Activity, { type ActivityAttrs } from "../models/Activity";
import Subject, { type SubjectDocument } from "../models/Subject";
import { requireAuth, requireRole, type AuthPayload } from "../middleware/requireAuth";
import { normalizeBannerUrl } from "../lib/normalizeBannerUrl";

const BANNERS_DIR = path.join(process.cwd(), "uploads", "banners");
const VIDEOS_DIR = path.join(process.cwd(), "uploads", "videos");

// Limpieza de banners locales antiguos (/uploads/banners/...)
async function removeStoredBanner(url: string | null | undefined) {
  if (!url || typeof url !== "string" || !url.startsWith("/uploads/banners/"))
    return;
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
  return (
    typeof url === "string" && url.startsWith("/uploads/banners/")
  );
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

// Extiende la interfaz Request para incluir user con role y auth
declare global {
  namespace Express {
    interface User {
      role: string;
      // otros campos si es necesario
    }
    interface Request {
      user?: User;
      auth?: AuthPayload;
    }
  }
}

const router = Router();

const VALID_STATUSES = new Set(["draft", "published"]);

function normalizeStatus(status: unknown) {
  if (typeof status !== "string") return undefined;
  const trimmed = status.trim().toLowerCase();
  return VALID_STATUSES.has(trimmed)
    ? (trimmed as "draft" | "published")
    : undefined;
}

async function resolveSubject(
  subjectId?: unknown,
  subjectSlug?: unknown,
): Promise<SubjectDocument | null> {
  if (
    typeof subjectId === "string" &&
    mongoose.Types.ObjectId.isValid(subjectId)
  ) {
    const subject = await Subject.findById(subjectId);
    if (subject) return subject;
  }

  if (typeof subjectSlug === "string" && subjectSlug.trim()) {
    const subject = await Subject.findOne({
      slug: subjectSlug.trim().toLowerCase(),
    });
    if (subject) return subject;
  }

  return null;
}

async function touchSubject(
  subjectId: mongoose.Types.ObjectId | string | null | undefined,
) {
  if (!subjectId) return;
  const id =
    typeof subjectId === "string" &&
    mongoose.Types.ObjectId.isValid(subjectId)
      ? subjectId
      : subjectId instanceof mongoose.Types.ObjectId
      ? subjectId
      : null;

  if (!id) return;

  await Subject.updateOne(
    { _id: id },
    { $set: { updatedAt: new Date() } },
  ).catch((err) => {
    console.warn(
      "[activities] No se pudo actualizar updatedAt de la materia",
      err,
    );
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
router.post( "/admin/activities", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const rawBody = (req.body ?? {}) as Record<string, any>;
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
        payload.templateType = String(requestedTemplate)
          .trim()
          .toLowerCase();
      }

      if (status) {
        payload.status = status;
      } else {
        delete payload.status;
      }
      delete payload.isPublished;

      // solo usamos bannerUrl desde el body (URL ya subida a GCS)
      if (Object.prototype.hasOwnProperty.call(rawBody, "bannerUrl")) {
        const normalizedBanner = normalizeBannerUrl(
          typeof rawBody.bannerUrl === "string"
            ? rawBody.bannerUrl
            : null,
        );
        payload.bannerUrl = normalizedBanner;
      } else {
        payload.bannerUrl = null;
      }

      const parsedFields = parseActivityJson(
        rawBody.fieldsJSON,
        "fieldsJSON",
      );
      payload.fieldsJSON = parsedFields ?? {};
      const parsedConfig = parseActivityJson(rawBody.config, "config");
      payload.config = parsedConfig ?? {};

      const activity = new Activity(payload as Partial<ActivityAttrs>);
      await activity.save();
      await touchSubject(subjectObjectId);
      res.status(201).json(activity);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// READ
router.get( "/admin/activities", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const activities = await Activity.find();
      res.json(activities);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// UPDATE
router.put( "/admin/activities/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await Activity.findById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ error: "Actividad no encontrada." });
      }

      const rawBody = (req.body ?? {}) as Record<string, any>;
      let nextSubjectId = existing.subjectId;
      if (rawBody?.subjectId || rawBody?.subjectSlug) {
        const subject = await resolveSubject(
          rawBody?.subjectId,
          rawBody?.subjectSlug,
        );
        if (!subject) {
          return res.status(404).json({
            error: "Materia no encontrada para asociar la actividad.",
          });
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
        updatable.templateType = String(requestedTemplate)
          .trim()
          .toLowerCase();
      }

      if (status) {
        updatable.status = status;
      } else {
        delete updatable.status;
      }
      delete updatable.isPublished;

      // Manejo de banner solo como URL
      let bannerToRemove: string | null = null;
      const previousBanner = existing.bannerUrl ?? null;

      delete updatable.bannerUrl;

      if (
        Object.prototype.hasOwnProperty.call(rawBody, "bannerUrl")
      ) {
        const normalizedBanner = normalizeBannerUrl(
          typeof rawBody.bannerUrl === "string"
            ? rawBody.bannerUrl
            : null,
        );
        updatable.bannerUrl = normalizedBanner;

        // si teníamos un banner local viejo y:
        // - lo limpiamos (normalizedBanner null)
        // - o lo cambiamos a otro banner distinto
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
        const parsedFields = parseActivityJson(
          rawBody.fieldsJSON,
          "fieldsJSON",
        );
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
      handleError(res, err);
    }
  },
);

// DELETE
router.delete("/admin/activities/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const activity = await Activity.findByIdAndDelete(req.params.id);
      if (!activity)
        return res
          .status(404)
          .json({ error: "Actividad no encontrada." });

      // si el banner era local viejo, intenta limpiarlo
      await removeStoredBanner(activity.bannerUrl ?? null);
      await touchSubject(activity.subjectId);
      res.json({ message: "Actividad eliminada." });
    } catch (err) {
      handleError(res, err);
    }
  },
);

export default router;
