import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import Activity from "../models/Activity";
import ActivityAttempt from "../models/ActivityAttempt";
import UserProgress from "../models/UserProgress";
import XpEvent from "../models/XpEvent";
import { User } from "../models/User";
import { applyXpGain, normalizeLevel, xpForLevel } from "../lib/levels";

const router = Router();

const completionSchema = z
  .object({
    xpAwarded: z.number().int().min(0).max(50_000).optional(),
    coinsAwarded: z.number().int().min(0).max(50_000).optional(),
    correctCount: z.number().int().min(0).optional(),
    totalCount: z.number().int().min(0).optional(),
    durationSec: z.number().int().min(0).optional(),
    estimatedDurationSec: z.number().int().min(0).nullable().optional(),
  })
  .strict();

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

router.post("/activities/:id/complete", requireAuth, async (req: any, res) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID de actividad inválido" });
  }

  const parsed = completionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const activity = await Activity.findById(id)
    .select({ _id: 1, subjectId: 1, xpReward: 1 })
    .lean<{ _id: Types.ObjectId; subjectId?: Types.ObjectId | string; xpReward?: number } | null>();

  if (!activity) {
    return res.status(404).json({ error: "Actividad no encontrada" });
  }

  const subjectIdRaw = activity.subjectId;
  if (!subjectIdRaw) {
    return res.status(422).json({ error: "La actividad no tiene una materia asociada" });
  }

  const subjectId =
    subjectIdRaw instanceof Types.ObjectId
      ? subjectIdRaw
      : Types.ObjectId.isValid(subjectIdRaw)
      ? new Types.ObjectId(subjectIdRaw)
      : null;

  if (!subjectId) {
    return res.status(422).json({ error: "Materia asociada a la actividad inválida" });
  }

  const userId = req.auth?.sub;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const activityObjectId = new Types.ObjectId(id);
  const hasCompletedActivity = await ActivityAttempt.exists({
    userId: user._id,
    activityId: activityObjectId,
  });
  const alreadyCompleted = !!hasCompletedActivity;

  const payload = parsed.data;
  const baseXp = Math.max(0, Math.round(activity.xpReward ?? 0));
  const requestedXp = payload.xpAwarded ?? baseXp;
  const xpCap = baseXp > 0 ? baseXp : 50_000;
  const xpAwarded = clamp(Math.round(requestedXp), 0, xpCap);

  const requestedCoins = payload.coinsAwarded ?? xpAwarded;
  const coinsAwarded = clamp(Math.round(requestedCoins), 0, 50_000);

  const correctCount = payload.correctCount ?? 0;
  const totalCount = payload.totalCount ?? 0;
  const rawDurationSec = payload.durationSec ?? 0;
  const durationSec = Math.max(0, Math.round(rawDurationSec));
  const estimatedDurationSec = payload.estimatedDurationSec ?? null;
  const score = totalCount > 0 ? clamp(correctCount / totalCount, 0, 1) : 1;

  const now = new Date();
  const endedAt = now;
  const startedAt =
    durationSec > 0 ? new Date(endedAt.getTime() - durationSec * 1000) : endedAt;

  if (xpAwarded > 0) {
    const updated = applyXpGain(user.level, user.xp, xpAwarded);
    user.level = normalizeLevel(updated.level);
    user.xp = updated.xpInLevel;
  } else {
    user.level = normalizeLevel(user.level);
    const required = xpForLevel(user.level);
    if (user.xp >= required) {
      const normalized = applyXpGain(user.level, user.xp % required, 0);
      user.level = normalizeLevel(normalized.level);
      user.xp = normalized.xpInLevel;
    }
  }

  if (coinsAwarded > 0) {
    user.coins = Math.max(0, Math.round(user.coins ?? 0) + coinsAwarded);
  }

  if (!alreadyCompleted) {
    user.activitiesCompleted = Math.max(0, Math.round(user.activitiesCompleted ?? 0) + 1);
  }

  if (xpAwarded > 0) {
    const lastCheck = user.streak?.lastCheck ? new Date(user.streak.lastCheck) : null;
    const today = getToday();
    let nextCount = Math.max(0, user.streak?.count ?? 0);

    if (!lastCheck) {
      nextCount = 1;
    } else {
      const lastDay = new Date(lastCheck);
      lastDay.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / 86_400_000);
      if (diffDays <= 0) {
        nextCount = Math.max(1, nextCount);
      } else if (diffDays === 1) {
        nextCount += 1;
      } else {
        nextCount = 1;
      }
    }

    user.streak = { count: nextCount, lastCheck: now };
  }

  const attempt = await ActivityAttempt.create({
    userId: user._id,
    activityId: activityObjectId,
    subjectId,
    score,
    xpAwarded,
    correctCount: Math.max(0, Math.round(correctCount)),
    totalCount: Math.max(0, Math.round(totalCount)),
    durationSec,
    status: "completed",
    startedAt,
    endedAt,
  });

  const tasks: Promise<unknown>[] = [user.save()];

  if (xpAwarded > 0) {
    tasks.push(
      UserProgress.awardXp(user._id, subjectId, xpAwarded, now).catch((err: any) => {
        console.error("No se pudo actualizar el progreso del usuario", err);
      }),
    );
    tasks.push(
      XpEvent.create({
        userId: user._id,
        currency: "xp",
        amount: xpAwarded,
        source: "activity_attempt",
        meta: {
          activityId: id,
          attemptId: attempt.id,
          subjectId: subjectId.toString(),
        },
      }).catch((err: any) => {
        console.error("No se pudo registrar el evento de XP", err);
      }),
    );
  }

  if (coinsAwarded > 0) {
    tasks.push(
      XpEvent.create({
        userId: user._id,
        currency: "coins",
        amount: coinsAwarded,
        source: "activity_attempt",
        meta: {
          activityId: id,
          attemptId: attempt.id,
          subjectId: subjectId.toString(),
        },
      }).catch((err: any) => {
        console.error("No se pudo registrar el evento de coins", err);
      }),
    );
  }

  await Promise.all(tasks);

  const safeUser = user.toJSON();
  const attemptJson: any = attempt.toJSON();
  const safeAttempt = {
    ...attemptJson,
    activityId: attemptJson.activityId?.toString?.() ?? attempt.activityId.toString(),
    subjectId: attemptJson.subjectId?.toString?.() ?? subjectId.toString(),
    createdAt:
      attemptJson.createdAt instanceof Date
        ? attemptJson.createdAt.toISOString()
        : attempt.createdAt?.toISOString?.() ?? null,
  };

  return res.json({
    xpAwarded,
    coinsAwarded,
    durationSec,
    estimatedDurationSec,
    score,
    streak: safeUser.streak,
    user: safeUser,
    attempt: safeAttempt,
  });
});

export default router;

