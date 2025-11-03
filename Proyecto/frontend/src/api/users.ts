import { api } from "../Lib/api";
import { IUserSafe } from "../types/user";

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
  return data.user;
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await api.post<{ avatarUrl: string }>("/profile/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.avatarUrl;
}
