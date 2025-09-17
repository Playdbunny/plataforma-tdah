// src/stores/subjectsStore.ts
// ============================================================
// Store de "Materias" (Subjects) usando Zustand con persistencia.
// CRUD mock sin backend: listar, crear, editar, eliminar, subir/quitar banners.
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ========================
// Tipo base de una materia
// ========================
export type Subject = {
  id: string;
  slug: string;             // p.ej. "matematicas"
  name: string;             // "Matemáticas"
  description?: string;     // descripción corta
  bannerUrl?: string | null; // URL del banner (subido o mock)
};

// ========================
// Estado + Acciones
// ========================
type SubjectsState = {
  items: Subject[];
  loading: boolean;
  error: string | null;

  list: () => Promise<void>;
  create: (p: { name: string; description?: string; slug?: string }) => Promise<Subject>;
  update: (id: string, patch: Partial<Pick<Subject,"name"|"description"|"slug">>) => Promise<Subject>;
  remove: (id: string) => Promise<void>;
  uploadBanner: (id: string, file: File) => Promise<Subject>;
  clearBanner: (id: string) => Promise<Subject>;
};

// ========================
// Datos iniciales (seed)
// ========================

const SEED: Subject[] =   [];

// ========================
// Utilidad para crear slug
// ========================
function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ========================
// Store (Zustand + persist)
// ========================
const MAX_BANNER_SIZE_MB = 20; // 👈 Cambia aquí el límite (20 MB recomendado)
const MAX_BANNER_SIZE = MAX_BANNER_SIZE_MB * 1024 * 1024;

export const useSubjectsStore = create<SubjectsState>()(
  persist(
    (set, get) => ({
      items: SEED,
      loading: false,
      error: null,

      list: async () => {
        set({ loading: true, error: null });
        try {
          await new Promise(r => setTimeout(r, 200));
        } catch {
          set({ error: "No se pudo listar materias" });
        } finally {
          set({ loading: false });
        }
      },

      create: async ({ name, description, slug }) => {
        const s: Subject = {
          id: crypto.randomUUID(),
          name: name.trim(),
          description: description?.trim(),
          slug: (slug?.trim() || toSlug(name)) || `subject-${Math.random().toString(36).slice(2,8)}`,
          bannerUrl: null,
        };
        set({ items: [s, ...get().items] });
        return s;
      },

      update: async (id, patch) => {
        const next = get().items.map(it => it.id === id ? { ...it, ...patch } : it);
        set({ items: next });
        return next.find(x => x.id === id)!;
      },

      remove: async (id) => {
        set({ items: get().items.filter(it => it.id !== id) });
      },

      // 📌 uploadBanner (mock con ObjectURL local)
    uploadBanner: async (id, file) => {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
        throw new Error("Formato no soportado (usa PNG, JPG, WEBP o GIF)");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("La imagen excede 10MB");
      }

      const localUrl = URL.createObjectURL(file); // preview inmediato en SPA

      const next = get().items.map(it =>
        it.id === id ? { ...it, bannerUrl: localUrl } : it
      );
      set({ items: next });
      return next.find(x => x.id === id)!;
    },

      clearBanner: async (id) => {
        const next = get().items.map(it =>
          it.id === id ? { ...it, bannerUrl: null } : it
        );
        set({ items: next });
        return next.find(x => x.id === id)!;
      },
    }),
    { name: "subjects-store" }
  )
);
