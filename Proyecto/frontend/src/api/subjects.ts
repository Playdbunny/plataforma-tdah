import { api, getAdminApiBaseUrl } from "../Lib/api";

export type SubjectResponse = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  bannerUrl?: string | null;
};

export type SubjectPayload = {
  name: string;
  slug: string;
  description?: string;
};

// Obtener todas las materias desde el backend
export const getSubjects = async () => {
  const { data } = await api.get<SubjectResponse[]>("/subjects", {
    baseURL: getAdminApiBaseUrl(),
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
  const formData = new FormData();
  formData.append("banner", file);

  const { data } = await api.patch<SubjectResponse>(
    `/subjects/${subjectId}/banner`,
    formData,
    { baseURL: getAdminApiBaseUrl() },
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
