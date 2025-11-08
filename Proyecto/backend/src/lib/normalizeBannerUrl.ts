export function normalizeBannerUrl(input?: string | null): string | null {
  if (typeof input !== "string") return null;
  let u = input.trim();
  if (!u) return null;
  if (/^data:/i.test(u)) return null;
  u = u.split("#")[0].split("?")[0];
  u = u.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i, "");
  if (u.length > 512) return null;
  if (!/^(https?:\/\/|\/uploads\/)/i.test(u)) return null;
  return u;
}
