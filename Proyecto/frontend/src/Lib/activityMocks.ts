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
  linkTo?: string; // Ruta interna o URL externa asociada a la actividad
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
      description: "Plantilla base para crear una nueva infografía interactiva.",
      linkTo: "/historia/infografia",
    },
    {
      id: "hist-2",
      title: "Quiz - Plantilla editable",
      type: "quiz",
      status: "published",
      updatedAt: "2025-01-25T15:30:00Z",
      linkTo: "/historia/quiz",
    },
    {
      id: "hist-3",
      title: "PPT Animada - Plantilla editable",
      type: "ppt-animada",
      status: "draft",
      updatedAt: "2025-02-10T09:45:00Z",
      description: "Estructura sugerida para embebidos y notas de apoyo.",
      linkTo: "/historia/ppt-animada",
    },
    {
      id: "hist-4",
      title: "Video - Plantilla editable",
      type: "video",
      status: "published",
      updatedAt: "2025-01-12T18:20:00Z",
      description: "Modelo para incrustar videos con acciones complementarias.",
      linkTo: "/historia/video",
    },
    {
      id: "hist-5",
      title: "Juego - Próximamente",
      type: "juego",
      status: "archived",
      updatedAt: "2024-12-10T10:05:00Z",
    },
  ],
};

export function getActivityTypesForSubject(slug: string): SubjectActivityType[] {
  const activities = DEFAULT_ACTIVITIES_BY_SLUG[slug] ?? [];
  const uniqueTypes = new Set<SubjectActivityType>();
  activities.forEach((activity) => uniqueTypes.add(activity.type));
  return Array.from(uniqueTypes);
}
