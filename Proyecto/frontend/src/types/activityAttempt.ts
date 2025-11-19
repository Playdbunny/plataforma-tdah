export type ActivityAttemptStatus = {
  activityId: string;
  attemptsLimit: number | null;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  cooldownExpiresAt: string | null;
  locked: boolean;
};
