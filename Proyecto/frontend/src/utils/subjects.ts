// src/utils/subjects.ts
// Utilidades comunes relacionadas a materias.

const SUBJECT_SLUG_ALIASES: Record<string, string> = {
  math: "matematicas",
  history: "historia",
  chem: "quimica",
};

export function normalizeSubjectSlug(subjectId?: string | null): string {
  if (!subjectId) return "";
  const raw = subjectId.toLowerCase();
  return SUBJECT_SLUG_ALIASES[raw] ?? raw;
}

export { SUBJECT_SLUG_ALIASES };
