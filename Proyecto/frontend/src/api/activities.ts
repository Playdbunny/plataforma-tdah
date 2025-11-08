import { api, getAdminApiBaseUrl, getApiBaseUrl } from "../Lib/api";
import { SubjectActivity } from "../Lib/activityMocks";

export type ActivitySummary = {
  id: string;
  _id?: string;
  subjectId?: string | null;
  subjectSlug?: string | null;
  slug?: string | null;
  title: string;
  description?: string | null;
  bannerUrl?: string | null;
  kind?: string | null;
  xpReward?: number | null;
  status?: string | null;
  updatedAt?: string | null;
  estimatedMinutes?: number | null;
  material?: { type: string | null; url: string } | null;
  templateType?: string | null;
  config?: Record<string, unknown> | null;
};

// Obtener todas las actividades
export const getAdminActivities = async () => {
  const { data } = await api.get<SubjectActivity[]>("/activities", {
    baseURL: getAdminApiBaseUrl(),
  });
  return data;
};

export const getSubjectActivities = async (slug: string) => {
  const { data } = await api.get<ActivitySummary[]>(`/subjects/${slug}/activities`, {
    baseURL: getApiBaseUrl(),
  });
  return data;
};

export const getActivityDetail = async (id: string) => {
  const { data } = await api.get<ActivitySummary>(`/activities/${id}`, {
    baseURL: getApiBaseUrl(),
  });
  return data;
};

// Crear una nueva actividad
const appendFormValue = (formData: FormData, key: string, value: any) => {
  if (value === undefined) return;
  if (value === null) {
    formData.append(key, "");
    return;
  }
  if (value instanceof File) {
    formData.append(key, value);
    return;
  }
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
};

const buildActivityFormData = (
  activity: Partial<SubjectActivity>,
  bannerFile: File,
) => {
  const formData = new FormData();
  Object.entries(activity).forEach(([key, value]) => {
    appendFormValue(formData, key, value as any);
  });
  appendFormValue(formData, "banner", bannerFile);
  return formData;
};

export const createActivity = async (
  activity: Partial<SubjectActivity>,
  options?: { bannerFile?: File },
) => {
  const baseURL = getAdminApiBaseUrl();
  if (options?.bannerFile) {
    const formData = buildActivityFormData(activity, options.bannerFile);
    const { data } = await api.post<SubjectActivity>("/activities", formData, {
      baseURL,
    });
    return data;
  }

  const { data } = await api.post<SubjectActivity>("/activities", activity, {
    baseURL,
  });
  return data;
};

// Actualizar una actividad existente
export const updateActivity = async (
  id: string,
  activity: Partial<SubjectActivity>,
  options?: { bannerFile?: File },
) => {
  const baseURL = getAdminApiBaseUrl();
  if (options?.bannerFile) {
    const formData = buildActivityFormData(activity, options.bannerFile);
    const { data } = await api.put<SubjectActivity>(`/activities/${id}`, formData, {
      baseURL,
    });
    return data;
  }

  const { data } = await api.put<SubjectActivity>(`/activities/${id}`, activity, {
    baseURL,
  });
  return data;
};

// Eliminar una actividad
export const deleteActivity = async (id: string) => {
  await api.delete(`/activities/${id}`, {
    baseURL: getAdminApiBaseUrl(),
  });
};
