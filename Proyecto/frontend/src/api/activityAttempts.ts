import type { AxiosError } from "axios";
import { api, getApiBaseUrl } from "../Lib/api";
import type { ActivityAttemptStatus } from "../types/activityAttempt";

export async function getActivitiesAttemptStatus(
  activityIds: string[],
): Promise<ActivityAttemptStatus[]> {
  const uniqueIds = Array.from(new Set(activityIds.filter((id) => typeof id === "string" && id.trim().length > 0)));
  if (uniqueIds.length === 0) return [];

  const baseURL = getApiBaseUrl();

  const postStatuses = async (path: string) => {
    const { data } = await api.post<{ statuses: ActivityAttemptStatus[] }>(
      path,
      { activityIds: uniqueIds },
      { baseURL },
    );
    return Array.isArray(data?.statuses) ? data.statuses : [];
  };

  try {
    return await postStatuses("/activities/status");
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    if (status === 404) {
      return postStatuses("/student/activities/status");
    }
    throw error;
  }
}
