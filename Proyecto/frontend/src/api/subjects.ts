import { api } from "../Lib/api";
import { Subject } from "../stores/subjectsStore";

// Obtener todas las materias desde el backend
export const getSubjects = async () => {
  const { data } = await api.get<Subject[]>("/admin/subjects");
  return data;
};
