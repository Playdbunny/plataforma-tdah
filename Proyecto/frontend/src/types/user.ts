export type Role = "student" | "admin";
export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;

export interface IUserSafe {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string | null;
  role: Role;
  tdahType: TDAHType;
  education?: string | null;
  character?: {
    id: string;
    name: string;
    sprite: string;
  } | null;
  ownedCharacters?: string[];

  xp: number;
  coins: number;
  level: number;
  activitiesCompleted: number;
  courseBadges: number;
  streak: { count: number; lastCheck?: Date | null };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date | null;
}