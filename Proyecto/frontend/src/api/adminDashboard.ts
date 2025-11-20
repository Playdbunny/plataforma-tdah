import { api } from "@/lib/api";

export type StudentsGrowthPoint = {
  date: string;
  newStudents: number;
  totalStudents: number;
};

export type StudentsGrowthResponse = {
  days: number;
  points: StudentsGrowthPoint[];
};

export async function getStudentsGrowth(days: number) {
  const { data } = await api.get<StudentsGrowthResponse>("/admin/dashboard/students-growth", {
    params: { days },
  });
  return data;
}

export type AvgCompletionTimePoint = {
  date: string;
  avgDurationSec: number;
};

export type AvgCompletionTimeResponse = {
  days: number;
  points: AvgCompletionTimePoint[];
};

export async function getAvgCompletionTime(days: number) {
  const { data } = await api.get<AvgCompletionTimeResponse>(
    "/admin/dashboard/avg-completion-time",
    {
      params: { days },
    },
  );
  return data;
}
