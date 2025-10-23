import { api, getAdminApiBaseUrl } from "../Lib/api";
import type { TDAHType } from "../types/user";

export type AdminStudentSubjectProgress = {
  subjectId: string;
  subjectName: string;
  subjectSlug: string | null;
  unitsCompleted: number;
  xp: number;
  progressPercent: number;
  lastActivityAt: string | null;
};

export type AdminStudentSummary = {
  id: string;
  name: string;
  email: string;
  tdahType: TDAHType;
  xp: number;
  coins: number;
  level: number;
  avatarUrl: string | null;
  streakCount: number;
  streakLastCheck: string | null;
  lastLogin: string | null;
  lastActivityAt: string | null;
  progressAverage: number;
};

export type AdminStudentActivity = {
  id: string;
  currency: "xp" | "coins";
  amount: number;
  source: string;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

export type AdminStudentDetail = AdminStudentSummary & {
  progress: {
    subjects: AdminStudentSubjectProgress[];
    average: number;
  };
  weeklyXp: number[];
  recentActivity: AdminStudentActivity[];
};

export async function fetchAdminStudents(): Promise<AdminStudentSummary[]> {
  const { data } = await api.get<{ items: AdminStudentSummary[] }>(
    "/students",
    { baseURL: getAdminApiBaseUrl() }
  );
  return data.items ?? [];
}

export async function fetchAdminStudentDetail(
  id: string
): Promise<AdminStudentDetail> {
  const { data } = await api.get<{ student: AdminStudentDetail }>(
    `/students/${id}`,
    { baseURL: getAdminApiBaseUrl() }
  );
  return data.student;
}
