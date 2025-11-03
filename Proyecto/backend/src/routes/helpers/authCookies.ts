import type { Request, Response } from "express";

export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_PATH = "/api/auth";
const CLEAR_PATHS = ["/", "/api", REFRESH_COOKIE_PATH];

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function setRefreshTokenCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

export function clearRefreshTokenCookies(res: Response) {
  const baseOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
  };

  for (const path of CLEAR_PATHS) {
    res.clearCookie(REFRESH_COOKIE_NAME, { ...baseOptions, path });
  }
}

export function readRefreshTokenFromRequest(req: Request): string | null {
  const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null;
  if (bodyToken) {
    return bodyToken;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(/; */);
  for (const cookie of cookies) {
    if (!cookie) continue;
    const [rawName, ...rest] = cookie.split("=");
    if (!rawName || rest.length === 0) continue;
    const name = decodeURIComponent(rawName.trim());
    if (name !== REFRESH_COOKIE_NAME) continue;
    const value = rest.join("=");
    return decodeURIComponent(value.trim());
  }

  return null;
}
