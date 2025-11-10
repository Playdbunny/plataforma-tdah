import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { xpForLevel } from "../../../Lib/Levels";
import {
  submitActivityCompletion,
  type ActivityCompletionResponse,
} from "../../../api/activities";
import { useAppStore } from "../../../stores/appStore";
import { useAuthStore } from "../../../stores/authStore";
import type { ActivityDetail } from "./shared";
import { extractQuestions } from "./shared";

const MIN_ESTIMATED_DURATION_SEC = 180;
const BASE_TIME_PER_QUESTION_SEC = 60;
const FAST_THRESHOLD_RATIO = 0.6;
const MEDIUM_THRESHOLD_RATIO = 0.8;
const MAX_COMPLETION_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 8000;

function computeEstimatedDuration(config: ActivityDetail["config"]): number | null {
  const questions = extractQuestions(config);
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }
  const estimated = questions.length * BASE_TIME_PER_QUESTION_SEC;
  return Math.max(MIN_ESTIMATED_DURATION_SEC, estimated);
}

function resolveTimeMultiplier(
  elapsedSec: number,
  estimatedSec: number | null,
): number {
  if (!Number.isFinite(elapsedSec) || elapsedSec <= 0) return 1;
  if (!Number.isFinite(estimatedSec ?? NaN) || !estimatedSec || estimatedSec <= 0)
    return 1;

  const fastLimit = Math.ceil(estimatedSec * FAST_THRESHOLD_RATIO);
  const mediumLimit = Math.ceil(estimatedSec * MEDIUM_THRESHOLD_RATIO);

  if (elapsedSec <= fastLimit) return 1;
  if (elapsedSec <= mediumLimit) return 0.75;
  if (elapsedSec <= estimatedSec) return 0.5;
  return 0.25;
}

function normalizeReward(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function extractCoinsReward(activity: ActivityDetail, fallback: number): number {
  const config = activity.config;
  if (!config || typeof config !== "object") return fallback;
  const record = config as Record<string, unknown>;
  const keys = ["coinsReward", "coinReward", "rewardCoins", "coins"] as const;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return normalizeReward(value);
    }
  }
  return fallback;
}

interface FinishOptions {
  correctCount?: number;
  totalCount?: number;
}

export interface FinishResult {
  xpAwarded: number;
  coinsAwarded: number;
  durationSec: number;
  estimatedDurationSec: number | null;
  correctCount?: number;
  totalCount?: number;
}

export function useActivityCompletion(activity: ActivityDetail) {
  const xpReward = useMemo(() => normalizeReward(activity.xpReward ?? null), [
    activity.xpReward,
  ]);

  const coinsReward = useMemo(
    () => extractCoinsReward(activity, xpReward),
    [activity, xpReward],
  );

  const estimatedDurationSec = useMemo(
    () => computeEstimatedDuration(activity.config),
    [activity.config],
  );

  const updateUser = useAppStore((state) => state.updateUser);
  const setAppUser = useAppStore((state) => state.setUser);
  const patchAuthUser = useAuthStore((state) => state.setUser);

  const [finished, setFinished] = useState(false);
  const [awardedXp, setAwardedXp] = useState(0);
  const [awardedCoins, setAwardedCoins] = useState(0);
  const claimedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const durationRef = useRef(0);
  const estimatedRef = useRef<number | null>(estimatedDurationSec);

  const persistCompletion = useCallback(
    async (
      submission: {
        xpAwarded: number;
        coinsAwarded: number;
        correctCount?: number;
        totalCount?: number;
        durationSec: number;
        estimatedDurationSec: number | null;
      },
    ): Promise<ActivityCompletionResponse> => {
      let attempt = 0;
      let lastError: unknown = null;

      while (attempt < MAX_COMPLETION_ATTEMPTS) {
        try {
          const response = await submitActivityCompletion(activity.id, submission);
          const nextXp = xpForLevel(response.user.level ?? 1);
          const normalizedUser = { ...response.user, nextXp } as typeof response.user & {
            nextXp: number;
          };

          try {
            setAppUser(normalizedUser as any);
          } catch (err) {
            console.error("No se pudo sincronizar el usuario en appStore", err);
          }

          try {
            patchAuthUser(response.user);
          } catch (err) {
            console.error("No se pudo sincronizar el usuario en authStore", err);
          }

          updateUser({
            xp: normalizedUser.xp,
            level: normalizedUser.level,
            nextXp,
            coins: normalizedUser.coins,
            streak: normalizedUser.streak,
            activitiesCompleted: normalizedUser.activitiesCompleted,
            courseBadges: normalizedUser.courseBadges,
          });

          return response;
        } catch (err) {
          lastError = err;
          attempt += 1;
          if (attempt >= MAX_COMPLETION_ATTEMPTS) {
            break;
          }
          const backoffDelay = Math.min(
            RETRY_MAX_DELAY_MS,
            RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }

      console.error("No se pudo persistir la finalización de la actividad", lastError);
      alert(
        "No se pudo guardar tu progreso. Revisa tu conexión y vuelve a intentarlo.",
      );

      claimedRef.current = false;
      setFinished(false);
      setAwardedXp(0);
      setAwardedCoins(0);
      startTimeRef.current = Date.now();
      durationRef.current = 0;
      estimatedRef.current = estimatedDurationSec ?? null;

      throw lastError instanceof Error
        ? lastError
        : new Error("No se pudo persistir la finalización de la actividad");
    },
    [
      activity.id,
      patchAuthUser,
      setAppUser,
      updateUser,
    ],
  );

  useEffect(() => {
    startTimeRef.current = Date.now();
    durationRef.current = 0;
    claimedRef.current = false;
    setFinished(false);
    setAwardedXp(0);
    setAwardedCoins(0);
  }, [activity.id]);

  useEffect(() => {
    estimatedRef.current = estimatedDurationSec;
  }, [estimatedDurationSec]);

  const lastResultRef = useRef<FinishResult | null>(null);

  const finishActivity = useCallback(
    async (options: FinishOptions = {}): Promise<FinishResult> => {
      if (claimedRef.current && lastResultRef.current) {
        return lastResultRef.current;
      }

      claimedRef.current = true;

      const totalCount = Math.max(0, options.totalCount ?? 0);
      const boundedCorrect = Math.max(
        0,
        Math.min(options.correctCount ?? 0, totalCount),
      );
      const ratio = totalCount > 0 ? boundedCorrect / totalCount : 1;
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
      durationRef.current = elapsedSeconds;
      const timeMultiplier = resolveTimeMultiplier(elapsedSeconds, estimatedDurationSec);
      const grantedXp = Math.round(ratio * xpReward * timeMultiplier);
      const grantedCoins = Math.round(ratio * coinsReward * timeMultiplier);
      estimatedRef.current = estimatedDurationSec;

      setAwardedXp(grantedXp);
      setAwardedCoins(grantedCoins);

      let response: ActivityCompletionResponse | null = null;

      try {
        response = await persistCompletion({
          xpAwarded: grantedXp,
          coinsAwarded: grantedCoins,
          correctCount: options.correctCount,
          totalCount: options.totalCount,
          durationSec: elapsedSeconds,
          estimatedDurationSec: estimatedDurationSec ?? null,
        });
      } catch (err) {
        lastResultRef.current = null;
        throw err;
      }

      const result: FinishResult = {
        xpAwarded: normalizeReward(response?.xpAwarded ?? grantedXp),
        coinsAwarded: normalizeReward(response?.coinsAwarded ?? grantedCoins),
        durationSec: response?.durationSec ?? elapsedSeconds,
        estimatedDurationSec:
          response?.estimatedDurationSec ?? estimatedDurationSec ?? null,
        correctCount:
          response?.attempt?.correctCount ?? options.correctCount ?? undefined,
        totalCount: response?.attempt?.totalCount ?? options.totalCount ?? undefined,
      };

      lastResultRef.current = result;
      durationRef.current = result.durationSec;
      estimatedRef.current = result.estimatedDurationSec ?? null;
      setAwardedXp(result.xpAwarded);
      setAwardedCoins(result.coinsAwarded);
      setFinished(true);

      return result;
    },
    [
      coinsReward,
      xpReward,
      estimatedDurationSec,
      persistCompletion,
    ],
  );

  return {
    xpReward,
    coinsReward,
    finished,
    awardedXp,
    awardedCoins,
    finishActivity,
  };
}
