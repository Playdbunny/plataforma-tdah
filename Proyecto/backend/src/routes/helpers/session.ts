import { randomBytes, createHash } from "crypto";
import { IUserDoc } from "../../models/User";
import { signToken } from "./jwt-sign";

export type SessionPayload = {
  token: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: ReturnType<IUserDoc["toJSON"]>;
};

function buildRefreshExpiryDate(): Date {
  const env = process.env.JWT_REFRESH_EXPIRES;
  const now = Date.now();
  if (!env) {
    // Default: 30 days
    return new Date(now + 30 * 24 * 60 * 60 * 1000);
  }
  const numeric = Number(env);
  if (Number.isFinite(numeric) && numeric > 0) {
    // Interpret as seconds
    return new Date(now + numeric * 1000);
  }
  // Fallback to 30 days if env invalid
  return new Date(now + 30 * 24 * 60 * 60 * 1000);
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
  const refreshToken = randomBytes(48).toString("hex");
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = buildRefreshExpiryDate();
  return { refreshToken, refreshTokenHash, refreshTokenExpiresAt };
}

export async function issueSession(user: IUserDoc): Promise<SessionPayload> {
  const accessToken = signToken({ sub: user.id, role: user.role });
  const { refreshToken, refreshTokenHash, refreshTokenExpiresAt } = generateRefreshToken();

  user.refreshTokenHash = refreshTokenHash;
  user.refreshTokenExpiresAt = refreshTokenExpiresAt;

  await user.save();

  return {
    token: accessToken,
    refreshToken,
    refreshTokenExpiresAt,
    user: user.toJSON(),
  };
}

export async function revokeSession(user: IUserDoc): Promise<void> {
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;
  await user.save();
}