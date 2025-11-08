import type { ActivitySummary } from "../../../api/activities";

export type ActivityConfig = Record<string, any> | null | undefined;

export type ActivityDetail = ActivitySummary & {
  config?: ActivityConfig;
  templateType?: string | null;
};

export interface ActivityTemplateProps {
  activity: ActivityDetail;
  backTo: string;
}

export function resolveActivityType(activity: ActivityDetail): string | null {
  const template = activity.templateType ?? null;
  if (template) return template;
  const config = activity.config;
  if (config && typeof config === "object" && "activityType" in config) {
    const value = (config as Record<string, unknown>).activityType;
    if (typeof value === "string") return value;
  }
  return null;
}

export function resolveResourceUrl(config: ActivityConfig): string | null {
  if (!config || typeof config !== "object") return null;
  const asset = (config as Record<string, any>).asset;
  if (asset && typeof asset === "object") {
    if (typeof asset.dataUrl === "string" && asset.dataUrl.trim().length > 0) {
      return asset.dataUrl;
    }
    if (typeof asset.url === "string" && asset.url.trim().length > 0) {
      return asset.url;
    }
  }
  const fileUrl = (config as Record<string, any>).fileUrl;
  if (typeof fileUrl === "string" && fileUrl.trim().length > 0) {
    return fileUrl;
  }
  return null;
}

export function extractQuestions(config: ActivityConfig): any[] {
  if (!config || typeof config !== "object") return [];
  const questions = (config as Record<string, any>).questions;
  if (Array.isArray(questions)) {
    return questions;
  }
  return [];
}
