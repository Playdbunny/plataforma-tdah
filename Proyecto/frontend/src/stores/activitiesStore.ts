import { create } from "zustand";
import {
  getAdminActivities,
  getSubjectActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  type ActivitySummary,
} from "../api/activities";
import { SubjectActivity } from "../Lib/activityMocks";
import { getApiBaseUrl } from "../Lib/api";
import { useSubjectsStore } from "./subjectsStore";

const extractErrorMessage = (err: any, fallback: string) => {
  const message =
    err?.response?.data?.error ??
    err?.response?.data?.message ??
    err?.message ??
    fallback;
  return typeof message === "string" ? message : fallback;
};

export type PublicActivity = ActivitySummary & {
  subjectSlug?: string | null;
};

type ActivitiesState = {
  adminItems: SubjectActivity[];
  adminHasLoaded: boolean;
  activitiesBySubject: Record<string, PublicActivity[]>;
  loadedVersionBySubject: Record<string, number>;
  loading: boolean;
  error: string | null;
  version: number;

  fetchAdmin: () => Promise<void>;
  fetchActivities: (
    slug: string,
    options?: { force?: boolean },
  ) => Promise<PublicActivity[]>;
  invalidateSubject: (slug: string) => void;
  create: (activity: Partial<SubjectActivity>) => Promise<void>;
  update: (id: string, activity: Partial<SubjectActivity>) => Promise<void>;
  remove: (id: string, subjectSlug?: string | null) => Promise<void>;
};

const API_ORIGIN = getApiBaseUrl().replace(/\/+$/, "").replace(/\/?api$/, "");

function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${API_ORIGIN}${trimmed}` || trimmed;
  return `${API_ORIGIN}/${trimmed}`;
}

function normalizePublicActivity(
  activity: ActivitySummary,
  fallbackSlug?: string,
): PublicActivity {
  const rawId = activity.id || activity._id || "";
  const bannerUrl = resolveMediaUrl(activity.bannerUrl);
  const materialUrl = resolveMediaUrl(activity.material?.url ?? null);
  return {
    ...activity,
    id: String(rawId),
    _id: String(rawId),
    subjectId: activity.subjectId ?? null,
    subjectSlug: activity.subjectSlug ?? fallbackSlug ?? null,
    bannerUrl,
    material: materialUrl
      ? { type: activity.material?.type ?? null, url: materialUrl }
      : null,
    updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : null,
    estimatedMinutes: activity.estimatedMinutes ?? null,
    kind: activity.kind ?? null,
    xpReward: activity.xpReward ?? null,
    status: activity.status ?? null,
  };
}

function resolveSubjectSlug(
  payload: Partial<SubjectActivity> | undefined,
  fallback?: Partial<SubjectActivity>,
): string | null {
  const direct = payload?.subjectSlug ?? fallback?.subjectSlug;
  if (direct) return direct;
  const subjectId = payload?.subjectId ?? fallback?.subjectId;
  if (subjectId) {
    const subject = useSubjectsStore
      .getState()
      .items.find((item) => item._id === subjectId || item.id === subjectId);
    return subject?.slug ?? null;
  }
  return null;
}

export const useActivitiesStore = create<ActivitiesState>((set, get) => ({
  adminItems: [],
  adminHasLoaded: false,
  activitiesBySubject: {},
  loadedVersionBySubject: {},
  loading: false,
  error: null,
  version: 0,

  fetchAdmin: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getAdminActivities();
      set({ adminItems: data, adminHasLoaded: true, error: null });
    } catch (e: any) {
      set({ error: extractErrorMessage(e, "Error al cargar actividades"), adminHasLoaded: true });
    } finally {
      set({ loading: false });
    }
  },

  fetchActivities: async (slug, options) => {
    const normalizedSlug = slug.trim().toLowerCase();
    const state = get();
    const cache = state.activitiesBySubject[normalizedSlug];
    const cacheVersion = state.loadedVersionBySubject[normalizedSlug];
    const shouldFetch =
      options?.force ||
      !cache ||
      cacheVersion !== state.version;

    if (!shouldFetch && cache) {
      return cache;
    }

    try {
      const data = await getSubjectActivities(normalizedSlug);
      const normalized = data.map((activity) =>
        normalizePublicActivity(activity, normalizedSlug),
      );
      set((current) => ({
        activitiesBySubject: { ...current.activitiesBySubject, [normalizedSlug]: normalized },
        loadedVersionBySubject: {
          ...current.loadedVersionBySubject,
          [normalizedSlug]: current.version,
        },
        error: null,
      }));
      return normalized;
    } catch (e: any) {
      const error = extractErrorMessage(e, "Error al cargar actividades");
      set({ error });
      throw new Error(error);
    }
  },

  invalidateSubject: (slug) => {
    const normalizedSlug = slug.trim().toLowerCase();
    set((state) => {
      const nextActivities = { ...state.activitiesBySubject };
      const nextLoaded = { ...state.loadedVersionBySubject };
      delete nextActivities[normalizedSlug];
      delete nextLoaded[normalizedSlug];
      return {
        activitiesBySubject: nextActivities,
        loadedVersionBySubject: nextLoaded,
        version: state.version + 1,
      };
    });
  },

  create: async (activity) => {
    set({ loading: true, error: null });
    try {
      const created = await createActivity(activity);
      const slug = resolveSubjectSlug(activity, created);
      await get().fetchAdmin();
      if (slug) {
        get().invalidateSubject(slug);
      }
      useSubjectsStore.getState().invalidateSubjects();
    } catch (e: any) {
      set({ error: extractErrorMessage(e, "Error al crear actividad") });
    } finally {
      set({ loading: false });
    }
  },

  update: async (id, activity) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateActivity(id, activity);
      const slug = resolveSubjectSlug(activity, updated);
      await get().fetchAdmin();
      if (slug) {
        get().invalidateSubject(slug);
      }
      useSubjectsStore.getState().invalidateSubjects();
    } catch (e: any) {
      set({ error: extractErrorMessage(e, "Error al actualizar actividad") });
    } finally {
      set({ loading: false });
    }
  },

  remove: async (id, subjectSlug) => {
    set({ loading: true, error: null });
    try {
      await deleteActivity(id);
      await get().fetchAdmin();
      if (subjectSlug) {
        get().invalidateSubject(subjectSlug);
      }
      useSubjectsStore.getState().invalidateSubjects();
    } catch (e: any) {
      set({ error: extractErrorMessage(e, "Error al eliminar actividad") });
    } finally {
      set({ loading: false });
    }
  },
}));
