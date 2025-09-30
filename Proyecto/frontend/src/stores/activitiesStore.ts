import { create } from "zustand";
import * as api from "../api/activities";
import { SubjectActivity } from "../Lib/activityMocks";

interface ActivitiesState {
  items: SubjectActivity[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (activity: Partial<SubjectActivity>) => Promise<void>;
  update: (id: string, activity: Partial<SubjectActivity>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useActivitiesStore = create<ActivitiesState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getActivities();
      set({ items: data, error: null });
    } catch (e: any) {
      set({ error: e?.response?.data?.error || "Error al cargar actividades" });
    } finally {
      set({ loading: false });
    }
  },
  create: async (activity) => {
    set({ loading: true, error: null });
    try {
      await api.createActivity(activity);
      await get().fetch();
    } catch (e: any) {
      set({ error: e?.response?.data?.error || "Error al crear actividad" });
    } finally {
      set({ loading: false });
    }
  },
  update: async (id, activity) => {
    set({ loading: true, error: null });
    try {
      await api.updateActivity(id, activity);
      await get().fetch();
    } catch (e: any) {
      set({ error: e?.response?.data?.error || "Error al actualizar actividad" });
    } finally {
      set({ loading: false });
    }
  },
  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteActivity(id);
      await get().fetch();
    } catch (e: any) {
      set({ error: e?.response?.data?.error || "Error al eliminar actividad" });
    } finally {
      set({ loading: false });
    }
  },
}));