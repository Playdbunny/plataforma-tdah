import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/requireAuth";

// Modelo dinámico para Subject (evita error si no hay archivo Subject.ts)
const Subject = mongoose.model("Subject", new mongoose.Schema({}, { strict: false }), "subjects");

const router = Router();


// GET /admin/subjects - Listar todas las materias (solo admin)
router.get("/admin/subjects", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener materias" });
  }
});

// POST /admin/subjects - Crear una nueva materia (solo admin)
router.post("/admin/subjects", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, slug, description, bannerUrl } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: "Faltan campos obligatorios: name y slug" });
    }
    const exists = await Subject.findOne({ slug });
    if (exists) {
      return res.status(409).json({ error: "Ya existe una materia con ese slug" });
    }
    const subject = await Subject.create({ name, slug, description, bannerUrl });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: "Error al crear materia" });
  }
});

export default router;
