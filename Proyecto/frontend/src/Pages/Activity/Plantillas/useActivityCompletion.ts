import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { xpForLevel } from "../../../Lib/Levels";
import { useAppStore } from "../../../stores/appStore";
import type { ActivityDetail } from "./shared";
import { extractQuestions } from "./shared";

const MIN_ESTIMATED_DURATION_SEC = 180;
const BASE_TIME_PER_QUESTION_SEC = 60;
const FAST_THRESHOLD_RATIO = 0.6;
const MEDIUM_THRESHOLD_RATIO = 0.8;

function computeEstimatedDuration(activity: ActivityDetail): number | null {
  const questions = extractQuestions(activity.config);
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
  redirectTo?: string | null;
}

interface FinishResult {
  xpAwarded: number;
  coinsAwarded: number;
  durationSec: number;
  estimatedDurationSec: number | null;
}

export function useActivityCompletion(activity: ActivityDetail) {
  const navigate = useNavigate();
  const xpReward = useMemo(() => normalizeReward(activity.xpReward ?? null), [
    activity.xpReward,
  ]);

  const coinsReward = useMemo(
    () => extractCoinsReward(activity, xpReward),
    [activity, xpReward],
  );

  const estimatedDurationSec = useMemo(
    () => computeEstimatedDuration(activity),
    [activity.config, activity.id],
  );

  const addCoins = useAppStore((state) => state.addCoins);
  const updateUser = useAppStore((state) => state.updateUser);

  const [finished, setFinished] = useState(false);
  const [awardedXp, setAwardedXp] = useState(0);
  const [awardedCoins, setAwardedCoins] = useState(0);
  const claimedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const durationRef = useRef(0);
  const estimatedRef = useRef<number | null>(estimatedDurationSec);

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

  const finishActivity = useCallback(
    (options: FinishOptions = {}): FinishResult => {
      if (claimedRef.current) {
        const redirectTarget = options.redirectTo ?? "/subjects";
        if (options.redirectTo !== undefined) {
          navigate(redirectTarget);
        }
        return {
          xpAwarded: awardedXp,
          coinsAwarded: awardedCoins,
          durationSec: durationRef.current,
          estimatedDurationSec: estimatedRef.current,
        };
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
      const timeMultiplier = resolveTimeMultiplier(
        elapsedSeconds,
        estimatedDurationSec,
      );
      const grantedXp = Math.round(ratio * xpReward * timeMultiplier);
      const grantedCoins = Math.round(ratio * coinsReward * timeMultiplier);
      estimatedRef.current = estimatedDurationSec;

      setFinished(true);
      setAwardedXp(grantedXp);
      setAwardedCoins(grantedCoins);

      if (grantedCoins > 0) {
        addCoins(grantedCoins);
      }

      if (grantedXp > 0) {
        const currentUser = useAppStore.getState().user;
        let level = currentUser?.level ?? 1;
        let xp = currentUser?.xp ?? 0;
        let nextXp = currentUser?.nextXp ?? xpForLevel(level);

        xp += grantedXp;

        while (xp >= nextXp) {
          xp -= nextXp;
          level += 1;
          nextXp = xpForLevel(level);
        }

        updateUser({ level, xp, nextXp });
      }

      const redirectTarget = options.redirectTo ?? "/subjects";
      if (redirectTarget) {
        navigate(redirectTarget);
      }

      return {
        xpAwarded: grantedXp,
        coinsAwarded: grantedCoins,
        durationSec: elapsedSeconds,
        estimatedDurationSec,
      };
    },
    [
      addCoins,
      coinsReward,
      navigate,
      awardedCoins,
      awardedXp,
      updateUser,
      xpReward,
      estimatedDurationSec,
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
