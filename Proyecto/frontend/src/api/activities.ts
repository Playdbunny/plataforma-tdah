import { api } from "../Lib/api";
import { SubjectActivity } from "../Lib/activityMocks";

// Obtener todas las actividades
export const getActivities = async () => {
  const { data } = await api.get<SubjectActivity[]>("/admin/activities");
  return data;
};

// Crear una nueva actividad
export const createActivity = async (activity: Partial<SubjectActivity>) => {
  const { data } = await api.post<SubjectActivity>("/admin/activities", activity);
  return data;
};

// Actualizar una actividad existente
export const updateActivity = async (id: string, activity: Partial<SubjectActivity>) => {
  const { data } = await api.put<SubjectActivity>(`/admin/activities/${id}`, activity);
  return data;
};

// Eliminar una actividad
export const deleteActivity = async (id: string) => {
  await api.delete(`/admin/activities/${id}`);
};