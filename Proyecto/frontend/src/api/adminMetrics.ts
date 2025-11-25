import { api } from "@/Lib/api";

export type AdminPrecisionToday = {
  precisionPercent: number;
  correctTotal: number;
  answersTotal: number;
};

export async function getAdminPrecisionToday(): Promise<AdminPrecisionToday> {
  const { data } = await api.get<AdminPrecisionToday>("/admin/metrics/precision-today");
  return {
    precisionPercent: data.precisionPercent ?? 0,
    correctTotal: data.correctTotal ?? 0,
    answersTotal: data.answersTotal ?? 0,
  };
}
