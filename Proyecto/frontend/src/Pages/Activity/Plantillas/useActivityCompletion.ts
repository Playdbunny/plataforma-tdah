import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { xpForLevel } from "../../../Lib/Levels";
import { useAppStore } from "../../../stores/appStore";
import type { ActivityDetail } from "./shared";

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

export function useActivityCompletion(activity: ActivityDetail) {
  const navigate = useNavigate();
  const xpReward = useMemo(() => normalizeReward(activity.xpReward ?? null), [
    activity.xpReward,
  ]);

  const coinsReward = useMemo(
    () => extractCoinsReward(activity, xpReward),
    [activity, xpReward],
  );

  const addCoins = useAppStore((state) => state.addCoins);
  const updateUser = useAppStore((state) => state.updateUser);

  const [finished, setFinished] = useState(false);
  const [awardedXp, setAwardedXp] = useState(0);
  const [awardedCoins, setAwardedCoins] = useState(0);
  const claimedRef = useRef(false);

  const finishActivity = useCallback(
    (options: FinishOptions = {}) => {
      if (claimedRef.current) {
        const redirectTarget = options.redirectTo ?? "/subjects";
        if (options.redirectTo !== undefined) {
          navigate(redirectTarget);
        }
        return {
          xpAwarded: awardedXp,
          coinsAwarded: awardedCoins,
        };
      }

      claimedRef.current = true;

      const totalCount = Math.max(0, options.totalCount ?? 0);
      const boundedCorrect = Math.max(
        0,
        Math.min(options.correctCount ?? 0, totalCount),
      );
      const ratio = totalCount > 0 ? boundedCorrect / totalCount : 1;
      const grantedXp = Math.round(ratio * xpReward);
      const grantedCoins = Math.round(ratio * coinsReward);

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
      };
    },
    [addCoins, coinsReward, navigate, awardedCoins, awardedXp, updateUser, xpReward],
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
