import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { User, type TDAHType, type IUserCharacter } from "../models/User";
import UserProgress from "../models/UserProgress";
import Subject from "../models/Subject";
import Activity from "../models/Activity";
import XpEvent from "../models/XpEvent";
import { currentTotalXp } from "../lib/levels";

const router = Router();

function toISO(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

type SubjectProgressDto = {
  subjectId: string;
  subjectName: string;
  subjectSlug: string | null;
  unitsCompleted: number;
  xp: number;
  progressPercent: number;
  lastActivityAt: string | null;
};

type StudentSummaryDto = {
  id: string;
  name: string;
  email: string;
  tdahType: TDAHType;
  xp: number;
  totalXp: number;
  coins: number;
  level: number;
  activitiesCompleted: number;
  courseBadges: number;
  avatarUrl: string | null;
  character: IUserCharacter | null;
  streakCount: number;
  streakLastCheck: string | null;
  lastLogin: string | null;
  lastActivityAt: string | null;
  progressAverage: number;
};

type StudentDetailDto = StudentSummaryDto & {
  progress: {
    subjects: SubjectProgressDto[];
    average: number;
  };
  weeklyXp: number[];
  recentActivity: Array<{
    id: string;
    currency: "xp" | "coins";
    amount: number;
    source: string;
    createdAt: string;
    meta: Record<string, unknown> | null;
  }>;
};

type UserLean = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  tdahType: TDAHType;
  xp?: number;
  coins?: number;
  level?: number;
  activitiesCompleted?: number;
  courseBadges?: number;
  avatarUrl?: string | null;
  character?: IUserCharacter | null;
  streak?: { count: number; lastCheck?: Date | null } | null;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

router.get(
  "/students",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    try {
      const users = await User.find({ role: "student" })
        .select(
          "name email tdahType xp coins level activitiesCompleted courseBadges avatarUrl character streak lastLogin createdAt updatedAt"
        )
        .lean<UserLean[]>();

      if (!users.length) {
        return res.json({ items: [] as StudentSummaryDto[] });
      }

      const userIds = users.map((u) => u._id as Types.ObjectId);

      type ProgressLean = {
        _id: Types.ObjectId;
        userId: Types.ObjectId;
        subjectId: Types.ObjectId;
        unitsCompleted: number;
        xp: number;
        lastActivityAt?: Date | null;
      };

      const progressDocs = await UserProgress.find({ userId: { $in: userIds } })
        .select("userId subjectId unitsCompleted xp lastActivityAt")
        .lean<ProgressLean[]>();

      const subjectIds = Array.from(
        new Set(progressDocs.map((doc) => doc.subjectId.toString()))
      ).map((id) => new Types.ObjectId(id));

      const [subjects, activitiesCount] = await Promise.all([
        subjectIds.length
          ? Subject.find({ _id: { $in: subjectIds } })
              .select("name slug")
              .lean()
          : [],
        subjectIds.length
          ? Activity.aggregate<{ _id: Types.ObjectId; total: number }>([
              { $match: { subjectId: { $in: subjectIds } } },
              { $group: { _id: "$subjectId", total: { $sum: 1 } } },
            ])
          : [],
      ]);

      const subjectNameMap = new Map<string, { name: string; slug: string | null }>();
      subjects.forEach((s) => {
        subjectNameMap.set(s._id.toString(), {
          name: s.name,
          slug: s.slug ?? null,
        });
      });

      const totalUnitsMap = new Map<string, number>();
      activitiesCount.forEach((entry) => {
        totalUnitsMap.set(entry._id.toString(), entry.total ?? 0);
      });

      const progressByUser = new Map<string, SubjectProgressDto[]>();
      progressDocs.forEach((doc) => {
        const userId = doc.userId.toString();
        const subjectId = doc.subjectId.toString();
        const totalUnits = totalUnitsMap.get(subjectId) ?? 0;
        const percent = totalUnits > 0
          ? Math.min(100, Math.round((doc.unitsCompleted / totalUnits) * 100))
          : 0;
        const subjectMeta = subjectNameMap.get(subjectId);

        const entry: SubjectProgressDto = {
          subjectId,
          subjectName: subjectMeta?.name ?? "Materia",
          subjectSlug: subjectMeta?.slug ?? null,
          unitsCompleted: doc.unitsCompleted ?? 0,
          xp: doc.xp ?? 0,
          progressPercent: percent,
          lastActivityAt: toISO(doc.lastActivityAt ?? null),
        };

        if (!progressByUser.has(userId)) {
          progressByUser.set(userId, []);
        }
        progressByUser.get(userId)!.push(entry);
      });

      const summaries: StudentSummaryDto[] = users.map((user) => {
        const userId = user._id.toString();
        const progress = progressByUser.get(userId) ?? [];
        const avg = progress.length
          ? Math.round(
              progress.reduce((acc, item) => acc + item.progressPercent, 0) /
                progress.length
            )
          : 0;

        const lastActivityCandidates = [
          user.lastLogin,
          ...progress
            .map((p) => (p.lastActivityAt ? new Date(p.lastActivityAt) : null))
            .filter((v): v is Date => v instanceof Date),
        ];
        const lastActivityAt = lastActivityCandidates.reduce<Date | null>(
          (latest, current) => {
            if (!current) return latest;
            if (!latest) return current;
            return current > latest ? current : latest;
          },
          null
        );

        const xpInLevel =
          typeof user.xp === "number" && Number.isFinite(user.xp)
            ? Math.max(0, Math.floor(user.xp))
            : 0;
        const totalXp = currentTotalXp(user.level ?? 1, xpInLevel);

        return {
          id: userId,
          name: user.name,
          email: user.email,
          tdahType: user.tdahType,
          xp: xpInLevel,
          totalXp,
          coins: user.coins ?? 0,
          level: user.level ?? 0,
          activitiesCompleted: user.activitiesCompleted ?? 0,
          courseBadges: user.courseBadges ?? 0,
          avatarUrl: user.avatarUrl ?? null,
          character: user.character ?? null,
          streakCount: user.streak?.count ?? 0,
          streakLastCheck: toISO(user.streak?.lastCheck ?? null),
          lastLogin: toISO(user.lastLogin ?? null),
          lastActivityAt: toISO(lastActivityAt),
          progressAverage: avg,
        } satisfies StudentSummaryDto;
      });

      summaries.sort((a, b) => b.totalXp - a.totalXp);

      return res.json({ items: summaries });
    } catch (err) {
      console.error("Error listing students", err);
      return res.status(500).json({ error: "No se pudieron obtener los estudiantes" });
    }
  }
);

router.get(
  "/students/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const user = await User.findOne({ _id: id, role: "student" })
        .select(
          "name email tdahType xp coins level activitiesCompleted courseBadges avatarUrl character streak lastLogin createdAt updatedAt"
        )
        .lean<UserLean | null>();

      if (!user) {
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }

      type ProgressLean = {
        _id: Types.ObjectId;
        userId: Types.ObjectId;
        subjectId: Types.ObjectId;
        unitsCompleted: number;
        xp: number;
        lastActivityAt?: Date | null;
      };

      const progressDocs = await UserProgress.find({ userId: user._id })
        .select("subjectId unitsCompleted xp lastActivityAt")
        .lean<ProgressLean[]>();

      const subjectIds = Array.from(
        new Set(progressDocs.map((doc) => doc.subjectId.toString()))
      ).map((sid) => new Types.ObjectId(sid));

      const [subjects, activitiesCount] = await Promise.all([
        subjectIds.length
          ? Subject.find({ _id: { $in: subjectIds } })
              .select("name slug")
              .lean()
          : [],
        subjectIds.length
          ? Activity.aggregate<{ _id: Types.ObjectId; total: number }>([
              { $match: { subjectId: { $in: subjectIds } } },
              { $group: { _id: "$subjectId", total: { $sum: 1 } } },
            ])
          : [],
      ]);

      const subjectNameMap = new Map<string, { name: string; slug: string | null }>();
      subjects.forEach((s) => {
        subjectNameMap.set(s._id.toString(), {
          name: s.name,
          slug: s.slug ?? null,
        });
      });

      const totalUnitsMap = new Map<string, number>();
      activitiesCount.forEach((entry) => {
        totalUnitsMap.set(entry._id.toString(), entry.total ?? 0);
      });

      const progressEntries: SubjectProgressDto[] = progressDocs.map((doc) => {
        const subjectId = doc.subjectId.toString();
        const subjectMeta = subjectNameMap.get(subjectId);
        const totalUnits = totalUnitsMap.get(subjectId) ?? 0;
        const percent = totalUnits > 0
          ? Math.min(100, Math.round((doc.unitsCompleted / totalUnits) * 100))
          : 0;

        return {
          subjectId,
          subjectName: subjectMeta?.name ?? "Materia",
          subjectSlug: subjectMeta?.slug ?? null,
          unitsCompleted: doc.unitsCompleted ?? 0,
          xp: doc.xp ?? 0,
          progressPercent: percent,
          lastActivityAt: toISO(doc.lastActivityAt ?? null),
        };
      });

      const averageProgress = progressEntries.length
        ? Math.round(
            progressEntries.reduce((acc, item) => acc + item.progressPercent, 0) /
              progressEntries.length
          )
        : 0;

      const now = new Date();
      const startOfWeek = getStartOfWeek(now);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      type XpEventLean = {
        _id: Types.ObjectId;
        currency: "xp" | "coins";
        amount: number;
        source: string;
        meta?: Record<string, unknown> | null;
        createdAt: Date;
      };

      const xpEventsWeek = await XpEvent.find({
        userId: user._id,
        currency: "xp",
        createdAt: { $gte: startOfWeek, $lt: endOfWeek },
      })
        .sort({ createdAt: 1 })
        .lean<XpEventLean[]>();

      const weeklyXp = Array(7).fill(0) as number[];
      xpEventsWeek.forEach((event) => {
        const diff = Math.floor(
          (event.createdAt.getTime() - startOfWeek.getTime()) / 86_400_000
        );
        if (diff >= 0 && diff < 7) {
          weeklyXp[diff] += event.amount;
        }
      });

      const recentEvents = await XpEvent.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean<XpEventLean[]>();

      const recentActivity = recentEvents.map((event) => ({
        id: event._id.toString(),
        currency: event.currency,
        amount: event.amount,
        source: event.source,
        createdAt: toISO(event.createdAt) ?? new Date().toISOString(),
        meta: event.meta ?? null,
      }));

      const lastActivityCandidates = [
        user.lastLogin,
        ...progressEntries
          .map((p) => (p.lastActivityAt ? new Date(p.lastActivityAt) : null))
          .filter((v): v is Date => v instanceof Date),
        ...recentActivity
          .map((item) => (item.createdAt ? new Date(item.createdAt) : null))
          .filter((v): v is Date => v instanceof Date),
      ];

      const lastActivityAt = lastActivityCandidates.reduce<Date | null>(
        (latest, current) => {
          if (!current) return latest;
          if (!latest) return current;
          return current > latest ? current : latest;
        },
        null
      );

      const xpInLevel =
        typeof user.xp === "number" && Number.isFinite(user.xp)
          ? Math.max(0, Math.floor(user.xp))
          : 0;
      const totalXp = currentTotalXp(user.level ?? 1, xpInLevel);

      const detail: StudentDetailDto = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        tdahType: user.tdahType,
        xp: xpInLevel,
        totalXp,
        coins: user.coins ?? 0,
        level: user.level ?? 0,
        activitiesCompleted: user.activitiesCompleted ?? 0,
        courseBadges: user.courseBadges ?? 0,
        avatarUrl: user.avatarUrl ?? null,
        character: user.character ?? null,
        streakCount: user.streak?.count ?? 0,
        streakLastCheck: toISO(user.streak?.lastCheck ?? null),
        lastLogin: toISO(user.lastLogin ?? null),
        lastActivityAt: toISO(lastActivityAt),
        progressAverage: averageProgress,
        progress: {
          subjects: progressEntries,
          average: averageProgress,
        },
        weeklyXp,
        recentActivity,
      };

      return res.json({ student: detail });
    } catch (err) {
      console.error("Error fetching student detail", err);
      return res
        .status(500)
        .json({ error: "No se pudo obtener la información del estudiante" });
    }
  }
);

export default router;
