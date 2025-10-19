import { api } from "../Lib/api";

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
  const { data } = await api.get<SubjectResponse[]>("/admin/subjects");
  return data;
};

export const createSubject = async (payload: SubjectPayload) => {
  const { data } = await api.post<SubjectResponse>("/admin/subjects", payload);
  return data;
};

export const updateSubject = async (
  subjectId: string,
  payload: Partial<SubjectPayload>,
) => {
  const { data } = await api.put<SubjectResponse>(
    `/admin/subjects/${subjectId}`,
    payload,
  );
  return data;
};

export const deleteSubject = async (subjectId: string) => {
  await api.delete(`/admin/subjects/${subjectId}`);
};

export const uploadSubjectBanner = async (subjectId: string, file: File) => {
  const formData = new FormData();
  formData.append("banner", file);

  const { data } = await api.patch<SubjectResponse>(
    `/admin/subjects/${subjectId}/banner`,
    formData,
  );

  return data;
};

export const clearSubjectBanner = async (subjectId: string) => {
  const { data } = await api.delete<SubjectResponse>(
    `/admin/subjects/${subjectId}/banner`,
  );
  return data;
};
