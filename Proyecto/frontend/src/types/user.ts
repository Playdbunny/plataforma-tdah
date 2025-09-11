export type Role = "student" | "admin";
export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;

export interface IUserSafe {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  role: Role;
  tdahType: TDAHType;

  xp: number;
  coins: number;
  level: number;
  streak: { count: number; lastCheck?: Date | null };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date | null;
}