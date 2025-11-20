import { api } from "../lib/api";

export type AdminDashboardOverview = {
  connectedStudents: number;
  totalActivities: number;
  topStudent: {
    id: string;
    name: string;
    xp: number;
    totalXp: number;
    level: number;
    lastLogin: string | null;
  } | null;
};

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const { data } = await api.get<AdminDashboardOverview>("/admin/dashboard/overview");
  return data;
}
