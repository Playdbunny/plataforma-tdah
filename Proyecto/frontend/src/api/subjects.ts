import { api, getAdminApiBaseUrl, getApiBaseUrl } from "../Lib/api";

export type SubjectResponse = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  bannerUrl?: string | null;
  updatedAt?: string;
};

export type SubjectPayload = {
  name: string;
  slug: string;
  description?: string;
};

// Obtener todas las materias desde el backend
export const getSubjects = async (options?: { public?: boolean }) => {
  const baseURL = options?.public ? getApiBaseUrl() : getAdminApiBaseUrl();
  const { data } = await api.get<SubjectResponse[]>("/subjects", {
    baseURL,
  });
  return data;
};

export const getSubject = async (slug: string) => {
  const { data } = await api.get<SubjectResponse>(`/subjects/${slug}`, {
    baseURL: getApiBaseUrl(),
  });
  return data;
};

export const createSubject = async (payload: SubjectPayload) => {
  const { data } = await api.post<SubjectResponse>("/subjects", payload, {
    baseURL: getAdminApiBaseUrl(),
  });
  return data;
};

export const updateSubject = async (
  subjectId: string,
  payload: Partial<SubjectPayload>,
) => {
  const { data } = await api.put<SubjectResponse>(
    `/subjects/${subjectId}`,
    payload,
    { baseURL: getAdminApiBaseUrl() },
  );
  return data;
};

export const deleteSubject = async (subjectId: string) => {
  await api.delete(`/subjects/${subjectId}`, {
    baseURL: getAdminApiBaseUrl(),
  });
};

export const uploadSubjectBanner = async (subjectId: string, file: File) => {
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);

  const { data: uploadResponse } = await api.post<{ url: string }>(
    `/uploads/banner`,
    uploadFormData,
  );

  const publicUrl = uploadResponse?.url;
  if (typeof publicUrl !== "string" || !publicUrl) {
    throw new Error("No se pudo obtener la URL pública del banner subido");
  }

  const { data } = await api.patch<SubjectResponse>(
    `/subjects/${subjectId}/banner`,
    { bannerUrl: publicUrl },
    {
      baseURL: getAdminApiBaseUrl(),
      headers: { "Content-Type": "application/json" },
    },
  );

  return data;
};

export const clearSubjectBanner = async (subjectId: string) => {
  const { data } = await api.delete<SubjectResponse>(
    `/subjects/${subjectId}/banner`,
    { baseURL: getAdminApiBaseUrl() },
  );
  return data;
};
