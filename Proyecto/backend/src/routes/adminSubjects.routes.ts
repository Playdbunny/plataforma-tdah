import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import Subject, { type SubjectDocument } from "../models/Subject";
import { requireAuth, requireRole } from "../middleware/requireAuth";

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

// POST /admin/subjects/:id/banner - Subir banner (Data URL enviado desde el front)
router.post(
  "/admin/subjects/:id/banner",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subject = await findSubjectOr404(id, res);
      if (!subject) return;

      const { banner } = req.body ?? {};
      if (typeof banner !== "string" || !banner.trim()) {
        return res.status(400).json({ error: "Banner inválido" });
      }

      const dataUrl = banner.trim();
      const dataUrlRegex =
        /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,[a-zA-Z0-9+/=]+$/;
      if (!dataUrlRegex.test(dataUrl)) {
        return res.status(400).json({ error: "Formato de imagen no soportado" });
      }

      if (Buffer.byteLength(dataUrl, "utf8") > 14 * 1024 * 1024) {
        return res.status(413).json({ error: "El banner excede el tamaño permitido" });
      }

      subject.bannerUrl = dataUrl;
      await subject.save();

      res.json(subject as SubjectDocument);
    } catch (err) {
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

      subject.bannerUrl = null;
      await subject.save();

      res.json(subject as SubjectDocument);
    } catch (err) {
      handleError(res, err, "Error al quitar banner");
    }
  },
);

export default router;
