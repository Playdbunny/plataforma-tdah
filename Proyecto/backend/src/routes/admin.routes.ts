import { Router } from "express";
import argon2 from "argon2";
import { User } from "../models/User";
import Activity from "../models/Activity";
import UserProgress from "../models/UserProgress";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { currentTotalXp } from "../lib/levels";

const router = Router();

/**
 * POST /admin/create
 * Solo un usuario con rol "admin" puede crear otros admins
 */
router.post("/create", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "Email ya registrado" });

  const passwordHash = await argon2.hash(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "admin",  // ← este sí se crea como admin
  });

  return res.status(201).json({ message: "Admin creado", user: user.toJSON() });
});

/**
 * GET /admin/dashboard/overview
 * Devuelve métricas generales para el dashboard del admin.
 */
router.get(
  "/dashboard/overview",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [recentLoginIds, recentActivityIds, topStudentDoc, totalActivities] = await Promise.all([
        User.distinct("_id", {
          role: "student",
          lastLogin: { $gte: fiveMinutesAgo },
        }),
        UserProgress.distinct("userId", {
          lastActivityAt: { $gte: fiveMinutesAgo },
        }),
        User.findOne({ role: "student" })
          .sort({ level: -1, xp: -1, createdAt: 1 })
          .select({ _id: 1, name: 1, xp: 1, level: 1, lastLogin: 1 }),
        Activity.countDocuments(),
      ]);

      const connectedStudents = new Set(
        [...recentLoginIds, ...recentActivityIds].map((id) => id.toString())
      ).size;

      const xpInLevel = typeof topStudentDoc?.xp === "number" ? Math.max(0, topStudentDoc.xp) : 0;
      const level = topStudentDoc?.level ?? 1;

      const topStudent = topStudentDoc
        ? {
            id: topStudentDoc._id.toString(),
            name: topStudentDoc.name,
            xp: xpInLevel,
            totalXp: currentTotalXp(level, xpInLevel),
            level,
            lastLogin: topStudentDoc.lastLogin ?? null,
          }
        : null;

      return res.json({
        connectedStudents,
        totalActivities,
        topStudent,
      });
    } catch (error) {
      console.error("Error fetching admin dashboard overview", error);
      return res.status(500).json({
        error: "No se pudo obtener el resumen del dashboard del admin.",
      });
    }
  }
);

export default router;