import { Router } from "express";
import argon2 from "argon2";
import { User } from "../models/User";
import Activity from "../models/Activity";
import UserProgress from "../models/UserProgress";
import ActivityAttempt from "../models/ActivityAttempt";
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

const MAX_RANGE_DAYS = 180;

const clampRangeDays = (input: unknown, fallback = 7) => {
  const parsed =
    typeof input === "string" ? Number.parseInt(input, 10) : Number(input ?? fallback);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), MAX_RANGE_DAYS);
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

router.get(
  "/dashboard/students-growth",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const days = clampRangeDays(req.query.days, 7);
      const today = endOfDay(new Date());
      const rangeStart = startOfDay(new Date(today));
      rangeStart.setDate(rangeStart.getDate() - (days - 1));

       const grouped = await User.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            role: "student",
            lastLogin: { $gte: rangeStart, $lte: today },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$lastLogin",
                timezone: "UTC",
              },
            },
            studentIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            _id: 1,
            count: { $size: "$studentIds" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const groupedMap = new Map(grouped.map((item) => [item._id, item.count]));
      const points: Array<{ date: string; connectedStudents: number }> = [];
      for (let i = 0; i < days; i++) {
        const current = new Date(rangeStart);
        current.setDate(rangeStart.getDate() + i);
        const key = dateKey(current);
        const connectedStudents = groupedMap.get(key) ?? 0;
        points.push({ date: current.toISOString(), connectedStudents });
      }

      res.json({ days, points });
    } catch (error) {
      console.error("Error fetching students growth", error);
      res.status(500).json({ error: "STUDENTS_GROWTH_FAILED" });
    }
  }
);

router.get(
  "/dashboard/avg-completion-time",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const days = clampRangeDays(req.query.days, 7);
      const today = endOfDay(new Date());
      const rangeStart = startOfDay(new Date(today));
      rangeStart.setDate(rangeStart.getDate() - (days - 1));

      const dateExpr = { $ifNull: ["$endedAt", "$createdAt"] } as const;
      const durationExpr = {
        $cond: [
          {
            $and: [
              { $ne: ["$startedAt", null] },
              { $ne: ["$endedAt", null] },
            ],
          },
          { $divide: [{ $subtract: ["$endedAt", "$startedAt"] }, 1000] },
          { $ifNull: ["$durationSec", 0] },
        ],
      } as const;

      const completedFilter = {
        $and: [
          {
            $or: [{ status: "completed" }, { status: null }],
          },
          {
            $expr: {
              $and: [
                { $gte: [{ $ifNull: ["$endedAt", "$createdAt"] }, rangeStart] },
                { $lte: [{ $ifNull: ["$endedAt", "$createdAt"] }, today] },
              ],
            },
          },
        ],
      };

      const aggregates = await ActivityAttempt.aggregate<{
        date: string;
        avgDurationSec: number;
      }>([
        { $match: completedFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: dateExpr,
                timezone: "UTC",
              },
            },
            durationSum: { $sum: durationExpr },
            durationCount: {
              $sum: {
                $cond: [{ $gt: [durationExpr, 0] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            avgDurationSec: {
              $cond: [
                { $gt: ["$durationCount", 0] },
                { $divide: ["$durationSum", "$durationCount"] },
                0,
              ],
            },
          },
        },
        { $sort: { date: 1 } },
      ]);

      const aggregatesMap = new Map(aggregates.map((item) => [item.date, item.avgDurationSec]));
      const points: Array<{ date: string; avgDurationSec: number }> = [];
      for (let i = 0; i < days; i++) {
        const current = new Date(rangeStart);
        current.setDate(rangeStart.getDate() + i);
        const key = dateKey(current);
        points.push({ date: current.toISOString(), avgDurationSec: aggregatesMap.get(key) ?? 0 });
      }

      res.json({ days, points });
    } catch (error) {
      console.error("Error fetching average completion time", error);
      res.status(500).json({ error: "AVG_COMPLETION_TIME_FAILED" });
    }
  }
);

export default router;
