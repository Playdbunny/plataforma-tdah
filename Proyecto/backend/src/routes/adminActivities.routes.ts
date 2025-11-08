import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import Activity, { type ActivityAttrs } from "../models/Activity";
import Subject, { type SubjectDocument } from "../models/Subject";
import { requireAuth, requireRole, type AuthPayload } from "../middleware/requireAuth";

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
  if (err?.name === 'ValidationError' || err?.code === 11000) {
    return res.status(422).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

// CREATE
router.post("/admin/activities", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { subjectId, subjectSlug } = req.body ?? {};

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
      req.body?.status ?? (req.body?.isPublished ? "published" : undefined),
    );

    const payload: Record<string, unknown> = {
      ...req.body,
      subjectId: subject._id,
      createdBy,
    };

    const requestedTemplate =
      typeof req.body?.templateType === "string"
        ? req.body.templateType
        : typeof req.body?.type === "string"
        ? req.body.type
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

    const activity = new Activity(payload as Partial<ActivityAttrs>);
    await activity.save();
    await touchSubject(subject._id);
    res.status(201).json(activity);
  } catch (err) {
    handleError(res, err);
  }
});

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
router.put("/admin/activities/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await Activity.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Actividad no encontrada." });
    }

    let nextSubjectId = existing.subjectId;
    if (req.body?.subjectId || req.body?.subjectSlug) {
      const subject = await resolveSubject(req.body?.subjectId, req.body?.subjectSlug);
      if (!subject) {
        return res.status(404).json({ error: "Materia no encontrada para asociar la actividad." });
      }
      nextSubjectId = subject._id;
      existing.subjectId = subject._id;
    }

    const status = normalizeStatus(
      req.body?.status ?? (req.body?.isPublished ? "published" : undefined),
    );

    const updatable: Record<string, unknown> = {
      ...req.body,
      subjectId: nextSubjectId,
    };

    const requestedTemplate =
      typeof req.body?.templateType === "string"
        ? req.body.templateType
        : typeof req.body?.type === "string"
        ? req.body.type
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

    existing.set(updatable as Partial<ActivityAttrs>);
    const updated = await existing.save();
    await touchSubject(nextSubjectId);
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE
router.delete("/admin/activities/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ error: "Actividad no encontrada." });
    await touchSubject(activity.subjectId);
    res.json({ message: "Actividad eliminada." });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
