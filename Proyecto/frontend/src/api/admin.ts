import { api } from "../Lib/api";

export type AdminDashboardOverview = {
  connectedStudents: number;
  totalActivities: number;
  topStudent: {
    id: string;
    name: string;
    xp: number;
    lastLogin: string | null;
  } | null;
};

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const { data } = await api.get<AdminDashboardOverview>("/admin/dashboard/overview");
  return data;
}
