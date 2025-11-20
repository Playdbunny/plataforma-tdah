import { api } from "../lib/api";
import { IUserSafe } from "../types/user";
import { normalizeAvatarUrl } from "../utils/avatar";
import { reviveUserDates } from "../utils/user_serializers";

async function uploadFile(kind: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<{ url: string }>(`/uploads/${kind}`, formData);
  const publicUrl = data?.url;

  if (typeof publicUrl !== "string" || !publicUrl) {
    throw new Error("No se pudo obtener la URL pública del archivo subido");
  }

  return publicUrl;
}

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
  return reviveUserDates(data.user);
}

export async function uploadAvatar(file: File): Promise<string> {
  const uploadedUrl = await uploadFile("avatar", file);
  const normalized = normalizeAvatarUrl(uploadedUrl, { cacheBuster: Date.now() });
  if (!normalized) throw new Error("La URL del avatar recibida es inválida");
  return normalized;
}
