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

export type ActivityKind =
  | "multiple_choice"
  | "true_false"
  | "video_quiz"
  | "ppt_review"
  | "embedded_quiz";

export type SubjectActivity = {
  id: string;
  title: string;
  type: SubjectActivityType;
  status: SubjectActivityStatus;
  updatedAt: string; // ISO string para mostrar fecha legible
  description?: string;
  subjectSlug: string; // materia a la que pertenece (mock)
  subjectId?: string; // id de materia real (backend)
  bannerUrl?: string | null;
  fieldsJSON?: Record<string, any>;
  slug?: string;
  templateType?: string;
  kind?: ActivityKind;
  xpReward?: number;
  config?: Record<string, any>;
};

// Permitir campos extra para compatibilidad backend
export type BackendActivityPayload = Partial<SubjectActivity> & {
  fieldsJSON?: any;
  templateType?: string;
  slug?: string;
  subjectId?: string;
  kind?: ActivityKind;
  config?: Record<string, any>;
  xpReward?: number;
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

export const DEFAULT_ACTIVITIES_BY_SLUG: Record<string, SubjectActivity[]> = {};

export function getActivityTypesForSubject(slug: string): SubjectActivityType[] {
  const activities = DEFAULT_ACTIVITIES_BY_SLUG[slug] ?? [];
  const uniqueTypes = new Set<SubjectActivityType>();
  activities.forEach((activity) => uniqueTypes.add(activity.type));
  return Array.from(uniqueTypes);
}
