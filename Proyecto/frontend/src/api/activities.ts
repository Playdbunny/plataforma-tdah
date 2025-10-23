import { api, getAdminApiBaseUrl } from "../Lib/api";
import { SubjectActivity } from "../Lib/activityMocks";

// Obtener todas las actividades
export const getActivities = async () => {
  const { data } = await api.get<SubjectActivity[]>("/activities", {
    baseURL: getAdminApiBaseUrl(),
  });
  return data;
};

// Crear una nueva actividad
export const createActivity = async (activity: Partial<SubjectActivity>) => {
  const { data } = await api.post<SubjectActivity>("/activities", activity, {
    baseURL: getAdminApiBaseUrl(),
  });
  return data;
};

// Actualizar una actividad existente
export const updateActivity = async (id: string, activity: Partial<SubjectActivity>) => {
  const { data } = await api.put<SubjectActivity>(`/activities/${id}`, activity, {
    baseURL: getAdminApiBaseUrl(),
  });
  return data;
};

// Eliminar una actividad
export const deleteActivity = async (id: string) => {
  await api.delete(`/activities/${id}`, {
    baseURL: getAdminApiBaseUrl(),
  });
};
