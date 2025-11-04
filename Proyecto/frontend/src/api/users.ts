import { api } from "../Lib/api";
import { IUserSafe } from "../types/user";
import { normalizeAvatarUrl } from "../utils/avatar";
import { reviveUserDates } from "../utils/user_serializers";

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
  username?: string;
  education?: string | null;
  character?: { id: string; name: string; sprite: string } | null;
  ownedCharacters?: string[];
  coins?: number;
};

export async function updateProfile(payload: UpdateProfilePayload): Promise<IUserSafe> {
  const { data } = await api.patch<{ user: IUserSafe }>("/profile", payload);
  return reviveUserDates(data.user);
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await api.post<{ avatarUrl: string }>("/profile/avatar", form);
  const normalized = normalizeAvatarUrl(data.avatarUrl, { cacheBuster: Date.now() });
  if (!normalized) throw new Error("La URL del avatar recibida es inválida");
  return normalized;
}
