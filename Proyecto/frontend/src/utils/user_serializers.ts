import { IUserSafe } from "../types/user";

export function reviveUserDates(u: any): IUserSafe {
  return {
    ...u,
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
    lastLogin: u?.lastLogin ? new Date(u.lastLogin) : null,
    streak: {
      count: u?.streak?.count ?? 0,
      lastCheck: u?.streak?.lastCheck ? new Date(u.streak.lastCheck) : null,
    },
  };
}