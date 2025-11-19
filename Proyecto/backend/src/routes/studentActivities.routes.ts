import { Router, type Response } from "express";
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

const ATTEMPT_COOLDOWN_MINUTES = 15;
const ATTEMPT_COOLDOWN_MS = ATTEMPT_COOLDOWN_MINUTES * 60 * 1000;

function resolveAttemptLimit(config: unknown): number | null {
  if (!config || typeof config !== "object") return null;
  const raw = (config as Record<string, unknown>).attempts;
  if (typeof raw !== "number") return null;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.max(1, Math.floor(raw));
}

interface AttemptStatus {
  attemptsLimit: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  cooldownExpiresAt: Date | null;
  locked: boolean;
}

type AttemptStatusResponse = {
  activityId: string;
  attemptsLimit: number | null;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  cooldownExpiresAt: string | null;
  locked: boolean;
};

async function computeAttemptStatus(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  attemptLimit: number,
  now: Date,
): Promise<AttemptStatus> {
  const attempts = await ActivityAttempt.find({ userId, activityId })
    .sort({ createdAt: -1 })
    .limit(attemptLimit)
    .select({ createdAt: 1 })
    .lean<{ createdAt?: Date }[]>();

  let attemptsUsed = 0;
  let previousTimestamp = now.getTime();
  let cooldownUntil: Date | null = null;

  for (const entry of attempts) {
    if (!entry?.createdAt) continue;
    const createdAt = new Date(entry.createdAt);
    const createdAtTime = createdAt.getTime();
    if (previousTimestamp - createdAtTime >= ATTEMPT_COOLDOWN_MS) {
      break;
    }
    attemptsUsed += 1;
    previousTimestamp = createdAtTime;
    if (attemptsUsed >= attemptLimit) {
      cooldownUntil = new Date(createdAtTime + ATTEMPT_COOLDOWN_MS);
      break;
    }
  }

  const isLocked = Boolean(cooldownUntil && cooldownUntil.getTime() > now.getTime());
  const attemptsRemaining = isLocked ? 0 : Math.max(0, attemptLimit - attemptsUsed);

  return {
    attemptsLimit: attemptLimit,
    attemptsUsed: isLocked ? attemptLimit : attemptsUsed,
    attemptsRemaining,
    cooldownExpiresAt: isLocked ? cooldownUntil : null,
    locked: isLocked,
  };
}

function serializeAttemptStatus(
  activityId: string,
  status: AttemptStatus,
): AttemptStatusResponse {
  return {
    activityId,
    attemptsLimit: status.attemptsLimit,
    attemptsUsed: status.attemptsUsed,
    attemptsRemaining: status.attemptsRemaining,
    cooldownExpiresAt: status.cooldownExpiresAt?.toISOString() ?? null,
    locked: status.locked,
  };
}

const attemptStatusRequestSchema = z
  .object({
    activityIds: z.array(z.string().trim().min(1)).min(1).max(50),
  })
  .strict();

async function handleAttemptStatusRequest(req: any, res: Response) {
  const parsed = attemptStatusRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = req.auth?.sub;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const requestedIds = parsed.data.activityIds;
  const validIds = requestedIds.filter((value) => Types.ObjectId.isValid(value));
  if (validIds.length === 0) {
    return res.json({ statuses: [] });
  }

  const uniqueObjectIds = Array.from(new Set(validIds)).map(
    (value) => new Types.ObjectId(value),
  );

  const activities = await Activity.find({ _id: { $in: uniqueObjectIds } })
    .select({ _id: 1, config: 1 })
    .lean<{ _id: Types.ObjectId; config?: Record<string, unknown> | null }[]>();

  const activityMap = new Map<string, { _id: Types.ObjectId; config?: Record<string, unknown> | null }>(
    activities.map((doc) => [doc._id.toString(), doc]),
  );

  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();
  const statuses = await Promise.all(
    validIds.map(async (id) => {
      const activity = activityMap.get(id);
      if (!activity) return null;
      const limit = resolveAttemptLimit(activity.config ?? null);
      if (!limit) {
        return {
          activityId: id,
          attemptsLimit: null,
          attemptsUsed: 0,
          attemptsRemaining: null,
          cooldownExpiresAt: null,
          locked: false,
        } satisfies AttemptStatusResponse;
      }
      const status = await computeAttemptStatus(userObjectId, activity._id, limit, now);
      return serializeAttemptStatus(id, status);
    }),
  );
  res.json({ statuses: statuses.filter((entry): entry is AttemptStatusResponse => Boolean(entry)) });
}

const attemptStatusPaths = ["/activities/status", "/student/activities/status"];
for (const path of attemptStatusPaths) {
  router.post(path, requireAuth, handleAttemptStatusRequest);
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
    .select({ _id: 1, subjectId: 1, xpReward: 1, config: 1 })
    .lean<
      | {
          _id: Types.ObjectId;
          subjectId?: Types.ObjectId | string;
          xpReward?: number;
          config?: Record<string, unknown> | null;
        }
      | null
    >();

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
  const attemptLimit = resolveAttemptLimit(activity.config ?? null);

  const now = new Date();

  if (attemptLimit) {
    const currentStatus = await computeAttemptStatus(
      user._id,
      activityObjectId,
      attemptLimit,
      now,
    );
    if (currentStatus.locked) {
      return res.status(429).json({
        error: "Alcanzaste el límite de intentos. Inténtalo más tarde.",
        code: "ATTEMPTS_LOCKED",
        attemptsLimit: attemptLimit,
        cooldownExpiresAt: currentStatus.cooldownExpiresAt?.toISOString() ?? null,
      });
    }
  }
  const hasCompletedActivity = await ActivityAttempt.exists({
    userId: user._id,
    activityId: activityObjectId,
  });
  const alreadyCompleted = !!hasCompletedActivity;

  const payload = parsed.data;
  const baseXp = Math.max(0, Math.round(activity.xpReward ?? 0));
  const requestedXp = payload.xpAwarded ?? baseXp;
  const xpCap = baseXp > 0 ? baseXp : 50_000;
  const normalizedXpAward = clamp(Math.round(requestedXp), 0, xpCap);

  const requestedCoins = payload.coinsAwarded ?? normalizedXpAward;
  const normalizedCoinsAward = clamp(Math.round(requestedCoins), 0, 50_000);

  const xpAwarded = alreadyCompleted ? 0 : normalizedXpAward;
  const coinsAwarded = alreadyCompleted ? 0 : normalizedCoinsAward;

  const correctCount = payload.correctCount ?? 0;
  const totalCount = payload.totalCount ?? 0;
  const rawDurationSec = payload.durationSec ?? 0;
  const durationSec = Math.max(0, Math.round(rawDurationSec));
  const estimatedDurationSec = payload.estimatedDurationSec ?? null;
  const score = totalCount > 0 ? clamp(correctCount / totalCount, 0, 1) : 1;

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

  if (!alreadyCompleted) {
    tasks.push(
      UserProgress.completeUnit(user._id, subjectId, xpAwarded, now).catch(
        (err: any) => {
          console.error("No se pudo actualizar el progreso del usuario", err);
        },
      ),
    );
  } else if (xpAwarded > 0) {
    tasks.push(
      UserProgress.awardXp(user._id, subjectId, xpAwarded, now).catch((err: any) => {
        console.error("No se pudo actualizar el progreso del usuario", err);
      }),
    );
  }

  if (xpAwarded > 0) {
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

  let nextAttemptStatus = null;
  if (attemptLimit) {
    const refreshedStatus = await computeAttemptStatus(
      user._id,
      activityObjectId,
      attemptLimit,
      new Date(),
    );
    nextAttemptStatus = serializeAttemptStatus(activityObjectId.toString(), refreshedStatus);
  }

  return res.json({
    xpAwarded,
    coinsAwarded,
    durationSec,
    estimatedDurationSec,
    score,
    streak: safeUser.streak,
    user: safeUser,
    attempt: safeAttempt,
    attemptStatus: nextAttemptStatus,
  });
});

export default router;

