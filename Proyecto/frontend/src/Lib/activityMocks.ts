// src/Lib/activityMocks.ts
// ==========================================================================
// Mock de actividades por materia utilizado tanto en la vista pública como en
// la de administración mientras no exista una API real. Centralizar estos
// datos evita duplicaciones entre páginas y facilita su futura sustitución.
// ==========================================================================

export type SubjectActivityType =
  | "infografia"
  | "quiz"
  | "ppt-animada"
  | "video"
  | "juego";

export type SubjectActivityStatus = "published" | "draft" | "archived";

export type SubjectActivity = {
  id: string;
  title: string;
  type: SubjectActivityType;
  status: SubjectActivityStatus;
  updatedAt: string; // ISO string para mostrar fecha legible
  description?: string;
  subjectSlug: string; // materia a la que pertenece
};

export const SUBJECT_ACTIVITY_TYPE_LABELS: Record<SubjectActivityType, string> = {
  infografia: "Infografía",
  quiz: "Quiz",
  "ppt-animada": "PPT Animada",
  video: "Video",
  juego: "Juego",
};

export const SUBJECT_ACTIVITY_STATUS_LABELS: Record<SubjectActivityStatus, string> = {
  published: "Publicado",
  draft: "Borrador",
  archived: "Archivado",
};

export const DEFAULT_ACTIVITIES_BY_SLUG: Record<string, SubjectActivity[]> = {
  historia: [
    {
      id: "hist-1",
      title: "Infografía - Primera Guerra Mundial",
      type: "infografia",
      status: "published",
      updatedAt: "2025-02-01T12:00:00Z",
      description: "Cronología visual de los hechos claves del conflicto.",
      subjectSlug: "historia",
    },
    {
      id: "hist-2",
      title: "Quiz - El Feudalismo",
      type: "quiz",
      status: "published",
      updatedAt: "2025-01-25T15:30:00Z",
      subjectSlug: "historia",
    },
    {
      id: "hist-3",
      title: "PPT Animada - Crisis de Occidente",
      type: "ppt-animada",
      status: "draft",
      updatedAt: "2025-02-10T09:45:00Z",
      description: "Presentación interactiva sobre la crisis del siglo XX.",
      subjectSlug: "historia",
    },
    {
      id: "hist-4",
      title: "Video - La Historia de Chile",
      type: "video",
      status: "published",
      updatedAt: "2025-01-12T18:20:00Z",
      subjectSlug: "historia",
    },
    {
      id: "hist-5",
      title: "Juego - Ruta de los Exploradores",
      type: "juego",
      status: "archived",
      updatedAt: "2024-12-10T10:05:00Z",
      subjectSlug: "historia",
    },
  ],
  matematicas: [
    {
      id: "mat-1",
      title: "Infografía - Álgebra básica",
      type: "infografia",
      status: "published",
      updatedAt: "2025-02-09T11:00:00Z",
      subjectSlug: "matematicas",
    },
    {
      id: "mat-2",
      title: "Quiz - Álgebra básica",
      type: "quiz",
      status: "draft",
      updatedAt: "2025-02-08T08:30:00Z",
      subjectSlug: "matematicas",
    },
    {
      id: "mat-3",
      title: "PPT Animada - Funciones lineales",
      type: "ppt-animada",
      status: "published",
      updatedAt: "2025-01-28T14:10:00Z",
      subjectSlug: "matematicas",
    },
    {
      id: "mat-4",
      title: "Video - Resolución de ecuaciones",
      type: "video",
      status: "published",
      updatedAt: "2025-01-15T16:50:00Z",
      subjectSlug: "matematicas",
    },
    {
      id: "mat-5",
      title: "Juego - Desafío mental",
      type: "juego",
      status: "draft",
      updatedAt: "2024-12-20T19:00:00Z",
      subjectSlug: "matematicas",
    },
  ],
  quimica: [
    {
      id: "quim-1",
      title: "Infografía - Tabla periódica",
      type: "infografia",
      status: "published",
      updatedAt: "2025-02-03T10:25:00Z",
      subjectSlug: "quimica",
    },
    {
      id: "quim-2",
      title: "Quiz - Enlaces químicos",
      type: "quiz",
      status: "published",
      updatedAt: "2025-01-30T13:15:00Z",
      subjectSlug: "quimica",
    },
    {
      id: "quim-3",
      title: "PPT Animada - Reacciones ácido-base",
      type: "ppt-animada",
      status: "draft",
      updatedAt: "2025-01-22T09:00:00Z",
      subjectSlug: "quimica",
    },
    {
      id: "quim-4",
      title: "Video - Laboratorio seguro",
      type: "video",
      status: "published",
      updatedAt: "2025-01-05T17:40:00Z",
      subjectSlug: "quimica",
    },
    {
      id: "quim-5",
      title: "Juego - Mezclas y soluciones",
      type: "juego",
      status: "archived",
      updatedAt: "2024-11-28T12:30:00Z",
      subjectSlug: "quimica",
    },
  ],
};

export function getActivityTypesForSubject(slug: string): SubjectActivityType[] {
  const activities = DEFAULT_ACTIVITIES_BY_SLUG[slug] ?? [];
  const uniqueTypes = new Set<SubjectActivityType>();
  activities.forEach((activity) => uniqueTypes.add(activity.type));
  return Array.from(uniqueTypes);
}
