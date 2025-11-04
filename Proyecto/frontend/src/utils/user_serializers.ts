import { IUserSafe } from "../types/user";
import { normalizeAvatarUrl } from "./avatar";

export function reviveUserDates(u: any): IUserSafe {
  const revived: IUserSafe = {
    ...u,
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
    lastLogin: u?.lastLogin ? new Date(u.lastLogin) : null,
    streak: {
      count: u?.streak?.count ?? 0,
      lastCheck: u?.streak?.lastCheck ? new Date(u.streak.lastCheck) : null,
    },
  };

  return {
    ...revived,
    avatarUrl: normalizeAvatarUrl(u?.avatarUrl),
  };
}