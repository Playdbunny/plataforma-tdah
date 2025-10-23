// ============================================================
// studentsStore.ts — Estado de estudiantes usando datos reales
// ============================================================

import { create } from "zustand";
import {
  fetchAdminStudents,
  type AdminStudentSummary,
} from "../api/adminStudents";

export type Student = AdminStudentSummary;

type StudentsState = {
  items: Student[];
  loading: boolean;
  error: string | null;

  list: () => Promise<void>;
  getById: (id: string) => Student | undefined;
};

export const useStudentsStore = create<StudentsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  list: async () => {
    set({ loading: true, error: null });
    try {
      const items = await fetchAdminStudents();
      set({ items });
    } catch (err: any) {
      const message = err?.response?.data?.error ?? err?.message ?? "Error al cargar estudiantes";
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  getById: (id) => get().items.find((s) => s.id === id),
}));
