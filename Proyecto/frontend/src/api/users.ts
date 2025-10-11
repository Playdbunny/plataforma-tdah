import { api } from "../Lib/api";
import { IUserSafe } from "../types/user";

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
  username?: string;
  avatarUrl?: string | null;
  education?: string | null;
  character?: { id: string; name: string; sprite: string } | null;
  ownedCharacters?: string[];
  coins?: number;
};

export async function updateProfile(payload: UpdateProfilePayload): Promise<IUserSafe> {
  const { data } = await api.patch<{ user: IUserSafe }>("/profile", payload);
  return data.user;
}
