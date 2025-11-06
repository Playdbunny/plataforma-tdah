// src/stores/subjectsStore.ts
// ============================================================
// Store de "Materias" (Subjects) usando Zustand con persistencia.
// Ahora consume el backend real para CRUD y banners, manteniendo
// compatibilidad con componentes que aún leen `subject.id`.
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "../api/subjects";
import type {
  SubjectPayload,
  SubjectResponse,
} from "../api/subjects";
import { getApiBaseUrl } from "../Lib/api";
import { useAppStore } from "./appStore";

// ========================
// Tipo base de una materia
// ========================
export type Subject = {
  _id: string;
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  bannerUrl?: string | null;
  updatedAt?: string | null;
};

// ========================
// Estado + Acciones
// ========================
type SubjectsState = {
  items: Subject[];
  loading: boolean;
  error: string | null;
  version: number;
  loadedVersion: number | null;

  fetchSubjects: (options?: { force?: boolean }) => Promise<Subject[]>;
  list: () => Promise<void>;
  invalidateSubjects: () => void;
  create: (
    p: { name: string; description?: string; slug?: string },
  ) => Promise<Subject>;
  update: (
    id: string,
    patch: Partial<Pick<Subject, "name" | "description" | "slug">>,
  ) => Promise<Subject>;
  remove: (id: string) => Promise<void>;
  uploadBanner: (id: string, file: File) => Promise<Subject>;
  clearBanner: (id: string) => Promise<Subject>;
};

const INITIAL_STATE: Pick<SubjectsState, "items" | "loading" | "error" | "version" | "loadedVersion"> = {
  items: [],
  loading: false,
  error: null,
  version: 0,
  loadedVersion: null,
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function resolveBannerUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = getApiBaseUrl().replace(/\/+$/, "");
  const origin = base.replace(/\/?api$/, "");
  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}` || trimmed;
  }

  return `${origin}/${trimmed}`;
}

function normalizeSubject(subject: SubjectResponse | Subject): Subject {
  const rawMongoId = (subject as any)._id ?? null;
  const legacyId = (subject as any).id ?? null;
  const fallbackSlug = "slug" in subject ? subject.slug : undefined;
  const resolvedId =
    (rawMongoId as string | null) ??
    (legacyId as string | null) ??
    (fallbackSlug ?? "");

  const finalId = resolvedId || `subject-${Math.random().toString(36).slice(2, 10)}`;

  const resolvedBanner = resolveBannerUrl(subject.bannerUrl ?? null);
  const updatedAt = (subject as any).updatedAt
    ? new Date((subject as any).updatedAt).toISOString()
    : null;

  return {
    ...subject,
    _id: String(rawMongoId ?? finalId),
    id: String(finalId),
    bannerUrl: resolvedBanner,
    updatedAt,
  } as Subject;
}

function extractErrorMessage(err: any, fallback: string) {
  const message =
    err?.response?.data?.error ??
    err?.response?.data?.message ??
    err?.message ??
    fallback;
  return typeof message === "string" ? message : fallback;
}

type FetchSubjectsOptions = {
  force?: boolean;
  forceAdmin?: boolean;
};

async function fetchAndSetSubjects(
  set: (partial: Partial<SubjectsState>) => void,
  get: () => SubjectsState,
  options?: FetchSubjectsOptions,
): Promise<Subject[]> {
  const appState = useAppStore.getState();
  const useAdminEndpoints = options?.forceAdmin ?? appState.isAdmin();

  const data = await api.getSubjects({ public: !useAdminEndpoints });
  const normalized = data.map(normalizeSubject);
  set({
    items: normalized,
    error: null,
    loadedVersion: get().version,
  });
  return normalized;
}

export const useSubjectsStore = create<SubjectsState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      fetchSubjects: async (options) => {
        const state = get();
        const shouldFetch =
          options?.force ||
          state.loadedVersion !== state.version ||
          state.items.length === 0;

        if (!shouldFetch) {
          return state.items;
        }

        set({ loading: true, error: null });
        try {
          const subjects = await fetchAndSetSubjects(set, get, options);
          return subjects;
        } catch (err) {
          const error = extractErrorMessage(err, "No se pudo listar materias");
          set({ error });
          throw new Error(error);
        } finally {
          set({ loading: false });
        }
      },

      list: async () => {
        await get().fetchSubjects({ force: true });
      },

      invalidateSubjects: () => {
        set((state) => ({
          items: [],
          loadedVersion: null,
          version: state.version + 1,
        }));
      },

      create: async ({ name, description, slug }) => {
        const trimmedName = name.trim();
        const trimmedDescription = description?.trim();
        const normalizedSlug = (slug?.trim() || toSlug(trimmedName)) ||
          `subject-${Math.random().toString(36).slice(2, 8)}`;

        set({ loading: true, error: null });
        try {
          const created = await api.createSubject({
            name: trimmedName,
            slug: normalizedSlug,
            description: trimmedDescription || undefined,
          });
          const normalized = normalizeSubject(created);
          set({ loadedVersion: null });
          set((state) => ({ version: state.version + 1 }));
          await fetchAndSetSubjects(set, get, { forceAdmin: true });
          return (
            get().items.find(
              (subject) => subject._id === normalized._id || subject.id === normalized.id,
            ) ?? normalized
          );
        } catch (err: any) {
          const message = extractErrorMessage(err, "No se pudo crear la materia");
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ loading: false });
        }
      },

      update: async (id, patch) => {
        const target = get().items.find(
          (subject) => subject._id === id || subject.id === id,
        );
        if (!target || !target._id) {
          const error =
            "Materia no encontrada o sin identificador válido. Refresca la lista.";
          set({ error });
          throw new Error(error);
        }

        const normalizedPatch: Partial<SubjectPayload> = {};
        if (patch.name) normalizedPatch.name = patch.name.trim();
        if (patch.description !== undefined) {
          normalizedPatch.description = patch.description?.trim();
        }
        if (patch.slug) {
          normalizedPatch.slug = patch.slug.trim();
        }

        set({ loading: true, error: null });
        try {
          const updated = await api.updateSubject(target._id, normalizedPatch);
          const normalized = normalizeSubject(updated);
          set({ loadedVersion: null });
          set((state) => ({ version: state.version + 1 }));
          await fetchAndSetSubjects(set, get, { forceAdmin: true });
          return (
            get().items.find(
              (subject) => subject._id === normalized._id || subject.id === normalized.id,
            ) ?? normalized
          );
        } catch (err: any) {
          const message = extractErrorMessage(err, "No se pudo actualizar la materia");
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ loading: false });
        }
      },

      remove: async (id) => {
        const target = get().items.find(
          (subject) => subject._id === id || subject.id === id,
        );
        if (!target || !target._id) {
          const error =
            "Materia no encontrada o sin identificador válido. Refresca la lista.";
          set({ error });
          throw new Error(error);
        }

        set({ loading: true, error: null });
        try {
          await api.deleteSubject(target._id);
          set({ loadedVersion: null });
          set((state) => ({ version: state.version + 1 }));
          await fetchAndSetSubjects(set, get, { forceAdmin: true });
        } catch (err: any) {
          const message = extractErrorMessage(err, "No se pudo eliminar la materia");
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ loading: false });
        }
      },

      uploadBanner: async (id, file) => {
        const target = get().items.find(
          (subject) => subject._id === id || subject.id === id,
        );
        if (!target || !target._id) {
          const error =
            "Materia no encontrada o sin identificador válido. Refresca la lista.";
          set({ error });
          throw new Error(error);
        }

        set({ loading: true, error: null });
        try {
          const updated = await api.uploadSubjectBanner(target._id, file);
          const normalized = normalizeSubject(updated);
          set({ loadedVersion: null });
          set((state) => ({ version: state.version + 1 }));
          await fetchAndSetSubjects(set, get, { forceAdmin: true });
          return (
            get().items.find(
              (subject) => subject._id === normalized._id || subject.id === normalized.id,
            ) ?? normalized
          );
        } catch (err: any) {
          const message = extractErrorMessage(err, "No se pudo subir el banner");
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ loading: false });
        }
      },

      clearBanner: async (id) => {
        const target = get().items.find(
          (subject) => subject._id === id || subject.id === id,
        );
        if (!target || !target._id) {
          const error =
            "Materia no encontrada o sin identificador válido. Refresca la lista.";
          set({ error });
          throw new Error(error);
        }

        set({ loading: true, error: null });
        try {
          const updated = await api.clearSubjectBanner(target._id);
          const normalized = normalizeSubject(updated);
          set({ loadedVersion: null });
          set((state) => ({ version: state.version + 1 }));
          await fetchAndSetSubjects(set, get, { forceAdmin: true });
          return (
            get().items.find(
              (subject) => subject._id === normalized._id || subject.id === normalized.id,
            ) ?? normalized
          );
        } catch (err: any) {
          const message = extractErrorMessage(err, "No se pudo limpiar el banner");
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "subjects-store-v3",
      version: 3,
      migrate: () => ({ ...INITIAL_STATE }),
    },
  ),
);
