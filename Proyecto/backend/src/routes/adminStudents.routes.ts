import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { User, type TDAHType, type IUserCharacter } from "../models/User";
import UserProgress from "../models/UserProgress";
import Subject from "../models/Subject";
import Activity from "../models/Activity";
import ActivityAttempt from "../models/ActivityAttempt";
import XpEvent from "../models/XpEvent";
import { currentTotalXp } from "../lib/levels";

const router = Router();

function toISO(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function toInt(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const asInt = Math.round(value);
  return asInt >= 0 ? asInt : fallback;
}

function calcProgressPercent(unitsCompleted: number, totalUnits: number) {
  if (!Number.isFinite(totalUnits) || totalUnits <= 0) return 0;
  const ratio = unitsCompleted / totalUnits;
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
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

type CompletionAggregate = {
  userId: Types.ObjectId;
  subjectId: Types.ObjectId;
  unitsCompleted: number;
  lastActivityAt?: Date | null;
};

async function aggregateCompletedUnits(match: Record<string, unknown>) {
  return ActivityAttempt.aggregate<CompletionAggregate>([
    { $match: match },
    {
      $group: {
        _id: { userId: "$userId", activityId: "$activityId" },
        subjectId: { $first: "$subjectId" },
        lastActivityAt: {
          $max: {
            $ifNull: ["$endedAt", "$createdAt"],
          },
        },
      },
    },
    {
      $group: {
        _id: { userId: "$_id.userId", subjectId: "$subjectId" },
        unitsCompleted: { $sum: 1 },
        lastActivityAt: { $max: "$lastActivityAt" },
      },
    },
    {
      $project: {
        _id: 0,
        userId: "$_id.userId",
        subjectId: "$_id.subjectId",
        unitsCompleted: 1,
        lastActivityAt: 1,
      },
    },
  ]);
}

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

      const completionAggregates = await aggregateCompletedUnits({
        userId: { $in: userIds },
      });

      const subjectIds = Array.from(
        new Set([
          ...progressDocs.map((doc) => doc.subjectId.toString()),
          ...completionAggregates.map((entry) => entry.subjectId.toString()),
        ])
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

      type SubjectProgressMap = Map<string, SubjectProgressDto>;
      const progressByUser = new Map<string, SubjectProgressMap>();
      const completionMap = new Map<string, { units: number; lastActivityAt: Date | null }>();

      completionAggregates.forEach((entry) => {
        const key = `${entry.userId.toString()}:${entry.subjectId.toString()}`;
        completionMap.set(key, {
          units: toInt(entry.unitsCompleted, 0),
          lastActivityAt: entry.lastActivityAt ?? null,
        });
      });

      const ensureUserProgressMap = (userId: string): SubjectProgressMap => {
        if (!progressByUser.has(userId)) {
          progressByUser.set(userId, new Map());
        }
        return progressByUser.get(userId)!;
      };

      progressDocs.forEach((doc) => {
        const userId = doc.userId.toString();
        const subjectId = doc.subjectId.toString();
        const subjectMeta = subjectNameMap.get(subjectId);
        if (!subjectMeta) return;

        const totalUnits = totalUnitsMap.get(subjectId) ?? 0;
        const completionKey = `${userId}:${subjectId}`;
        const completion = completionMap.get(completionKey);
        const unitsCompleted = completion?.units ?? toInt(doc.unitsCompleted, 0);
        const xpEarned = toInt(doc.xp, 0);
        const percent = calcProgressPercent(unitsCompleted, totalUnits);
        const lastActivitySource = completion?.lastActivityAt ?? doc.lastActivityAt ?? null;

        const entry: SubjectProgressDto = {
          subjectId,
          subjectName: subjectMeta.name,
          subjectSlug: subjectMeta.slug,
          unitsCompleted,
          xp: xpEarned,
          progressPercent: percent,
          lastActivityAt: toISO(lastActivitySource),
        };

        ensureUserProgressMap(userId).set(subjectId, entry);
      });

      completionAggregates.forEach((entry) => {
        const userId = entry.userId.toString();
        const subjectId = entry.subjectId.toString();
        const subjectMeta = subjectNameMap.get(subjectId);
        if (!subjectMeta) return;

        const unitsCompleted = toInt(entry.unitsCompleted, 0);
        const totalUnits = totalUnitsMap.get(subjectId) ?? 0;
        const isoDate = entry.lastActivityAt ? entry.lastActivityAt.toISOString() : null;
        const userMap = ensureUserProgressMap(userId);
        const existing = userMap.get(subjectId);

        if (existing) {
          existing.unitsCompleted = unitsCompleted;
          if (isoDate) {
            const previousDate = existing.lastActivityAt
              ? new Date(existing.lastActivityAt)
              : null;
            if (!previousDate || entry.lastActivityAt! > previousDate) {
              existing.lastActivityAt = isoDate;
            }
          }
          existing.progressPercent = calcProgressPercent(unitsCompleted, totalUnits);
        } else {
          userMap.set(subjectId, {
            subjectId,
            subjectName: subjectMeta.name,
            subjectSlug: subjectMeta.slug,
            unitsCompleted,
            xp: 0,
            progressPercent: calcProgressPercent(unitsCompleted, totalUnits),
            lastActivityAt: isoDate,
          });
        }
      });

      const summaries: StudentSummaryDto[] = users.map((user) => {
        const userId = user._id.toString();
        const progressEntries = progressByUser.get(userId);
        const progress = progressEntries ? Array.from(progressEntries.values()) : [];
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

      const completionAggregates = await aggregateCompletedUnits({ userId: user._id });

      const subjectIds = Array.from(
        new Set([
          ...progressDocs.map((doc) => doc.subjectId.toString()),
          ...completionAggregates.map((entry) => entry.subjectId.toString()),
        ])
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

      const progressMap = new Map<string, SubjectProgressDto>();
      const completionMap = new Map<string, { units: number; lastActivityAt: Date | null }>();

      completionAggregates.forEach((entry) => {
        completionMap.set(entry.subjectId.toString(), {
          units: toInt(entry.unitsCompleted, 0),
          lastActivityAt: entry.lastActivityAt ?? null,
        });
      });

      progressDocs.forEach((doc) => {
        const subjectId = doc.subjectId.toString();
        const subjectMeta = subjectNameMap.get(subjectId);
        if (!subjectMeta) return;

        const totalUnits = totalUnitsMap.get(subjectId) ?? 0;
        const completion = completionMap.get(subjectId);
        const unitsCompleted = completion?.units ?? toInt(doc.unitsCompleted, 0);
        const xpEarned = toInt(doc.xp, 0);
        const percent = calcProgressPercent(unitsCompleted, totalUnits);
        const lastActivitySource = completion?.lastActivityAt ?? doc.lastActivityAt ?? null;

        progressMap.set(subjectId, {
          subjectId,
          subjectName: subjectMeta.name,
          subjectSlug: subjectMeta.slug,
          unitsCompleted,
          xp: xpEarned,
          progressPercent: percent,
          lastActivityAt: toISO(lastActivitySource),
        });
      });

      completionAggregates.forEach((entry) => {
        const subjectId = entry.subjectId.toString();
        const subjectMeta = subjectNameMap.get(subjectId);
        if (!subjectMeta) return;

        const totalUnits = totalUnitsMap.get(subjectId) ?? 0;
        const unitsCompleted = toInt(entry.unitsCompleted, 0);
        const isoDate = entry.lastActivityAt ? entry.lastActivityAt.toISOString() : null;
        const existing = progressMap.get(subjectId);

        if (existing) {
          existing.unitsCompleted = unitsCompleted;
          if (isoDate) {
            const prev = existing.lastActivityAt ? new Date(existing.lastActivityAt) : null;
            if (!prev || entry.lastActivityAt! > prev) {
              existing.lastActivityAt = isoDate;
            }
          }
          existing.progressPercent = calcProgressPercent(unitsCompleted, totalUnits);
        } else {
          progressMap.set(subjectId, {
            subjectId,
            subjectName: subjectMeta.name,
            subjectSlug: subjectMeta.slug,
            unitsCompleted,
            xp: 0,
            progressPercent: calcProgressPercent(unitsCompleted, totalUnits),
            lastActivityAt: isoDate,
          });
        }
      });

      const progressEntries: SubjectProgressDto[] = Array.from(progressMap.values());

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
