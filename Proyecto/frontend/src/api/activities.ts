import { api, getAdminApiBaseUrl, getApiBaseUrl } from "../Lib/api";
import { SubjectActivity } from "../Lib/activityMocks";
import { IUserSafe } from "../types/user";
import { reviveUserDates } from "../utils/user_serializers";
import type { ActivityAttemptStatus } from "../types/activityAttempt";

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
  files?: { banner?: File | null; video?: File | null },
) => {
  const formData = new FormData();
  Object.entries(activity).forEach(([key, value]) => {
    appendFormValue(formData, key, value as any);
  });
  if (files?.banner) {
    appendFormValue(formData, "banner", files.banner);
  }
  if (files?.video) {
    appendFormValue(formData, "video", files.video);
  }
  return formData;
};

const uploadActivityBanner = async (file: File) => {
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);

  const { data } = await api.post<{ url: string }>("/uploads/banner", uploadFormData);
  const publicUrl = data?.url;
  if (typeof publicUrl !== "string" || !publicUrl) {
    throw new Error("No se pudo obtener la URL pública del banner subido");
  }

  return publicUrl;
};

export const createActivity = async (
  activity: Partial<SubjectActivity>,
  options?: { bannerFile?: File | null; videoFile?: File | null },
) => {
  const baseURL = getAdminApiBaseUrl();
  const payload: Partial<SubjectActivity> = { ...activity };

  if (options?.bannerFile) {
    payload.bannerUrl = await uploadActivityBanner(options.bannerFile);
  }

  if (options?.videoFile) {
    const formData = buildActivityFormData(payload, {
      video: options.videoFile ?? undefined,
    });
    const { data } = await api.post<SubjectActivity>("/activities", formData, {
      baseURL,
    });
    return data;
  }

  const { data } = await api.post<SubjectActivity>("/activities", payload, {
    baseURL,
  });
  return data;
};

// Actualizar una actividad existente
const DATA_URL_REGEX = /^data:/i;

function sanitizeActivityPayload(activity: Partial<SubjectActivity>) {
  const normalized: Partial<SubjectActivity> = { ...activity };

  if (typeof normalized.bannerUrl === "string" && DATA_URL_REGEX.test(normalized.bannerUrl)) {
    normalized.bannerUrl = null;
  }

  if (normalized.config && typeof normalized.config === "object") {
    const config = { ...(normalized.config as Record<string, any>) };
    normalized.config = config;
  }

  if (normalized.fieldsJSON && typeof normalized.fieldsJSON === "object") {
    const fields = { ...(normalized.fieldsJSON as Record<string, any>) }
    normalized.fieldsJSON = fields as any;
  }

  return normalized;
}

export const updateActivity = async (
  id: string,
  activity: Partial<SubjectActivity>,
  options?: { bannerFile?: File | null; videoFile?: File | null },
) => {
  const baseURL = getAdminApiBaseUrl();
  const sanitized = sanitizeActivityPayload(activity);
  const shouldSendFormData = Boolean(options?.videoFile);

  if (options?.bannerFile) {
    sanitized.bannerUrl = await uploadActivityBanner(options.bannerFile);
  }

  if (shouldSendFormData) {
    const formData = buildActivityFormData(sanitized, {
      video: options?.videoFile ?? undefined,
    });
    const { data } = await api.put<SubjectActivity>(`/activities/${id}`, formData, {
      baseURL,
    });
    return data;
  }

  const { data } = await api.put<SubjectActivity>(`/activities/${id}`, sanitized, {
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

export type ActivityCompletionPayload = {
  xpAwarded: number;
  coinsAwarded: number;
  correctCount?: number;
  totalCount?: number;
  durationSec?: number;
  estimatedDurationSec?: number | null;
};

export type ActivityCompletionResponse = {
  xpAwarded: number;
  coinsAwarded: number;
  durationSec: number;
  estimatedDurationSec: number | null;
  score: number;
  streak: { count: number; lastCheck: string | null };
  user: IUserSafe;
  attempt: {
    id: string;
    activityId: string;
    subjectId: string;
    xpAwarded: number;
    score: number;
    correctCount?: number;
    totalCount?: number;
    durationSec?: number;
    createdAt?: string;
  };
  attemptStatus?: ActivityAttemptStatus | null;
};

export async function submitActivityCompletion(
  activityId: string,
  payload: ActivityCompletionPayload,
): Promise<ActivityCompletionResponse> {
  const { data } = await api.post<ActivityCompletionResponse>(
    `/activities/${activityId}/complete`,
    payload,
    { baseURL: getApiBaseUrl() },
  );

  return {
    ...data,
    user: reviveUserDates(data.user),
    streak: {
      count: data.streak?.count ?? data.user?.streak?.count ?? 0,
      lastCheck:
        data.streak?.lastCheck != null
          ? new Date(data.streak.lastCheck).toISOString()
          : null,
    },
    attempt: {
      ...data.attempt,
      correctCount: data.attempt?.correctCount,
      totalCount: data.attempt?.totalCount,
    },
    attemptStatus: data.attemptStatus ?? null,
  };
}
