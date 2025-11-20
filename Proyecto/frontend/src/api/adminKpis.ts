import { api } from "../Lib/api";

export type AdminTodayKpis = {
  started: number;
  completed: number;
  completionRatePct: number;
  avgDurationSec: number;
  xpAwarded: number;
};

type AdminTodayKpisResponse = AdminTodayKpis & {
  range: { start: string; end: string };
};

export async function getAdminTodayKpis(): Promise<AdminTodayKpis> {
  const { data } = await api.get<AdminTodayKpisResponse>("/admin/kpis/today");
  return {
    started: data.started ?? 0,
    completed: data.completed ?? 0,
    completionRatePct: data.completionRatePct ?? 0,
    avgDurationSec: data.avgDurationSec ?? 0,
    xpAwarded: data.xpAwarded ?? 0,
  };
}
