import { getApiBaseUrl } from "../Lib/api";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

let cachedOrigin: string | null = null;

function sanitizeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveBackendOrigin(): string {
  if (cachedOrigin) return cachedOrigin;

  const base = sanitizeTrailingSlash(getApiBaseUrl());

  if (ABSOLUTE_URL_REGEX.test(base)) {
    try {
      const url = new URL(base);
      const pathname = sanitizeTrailingSlash(url.pathname);
      const withoutApi = pathname.endsWith("/api") ? pathname.slice(0, -4) : pathname;
      const suffix = withoutApi === "" ? "" : withoutApi;
      cachedOrigin = sanitizeTrailingSlash(`${url.origin}${suffix}`) || url.origin;
      return cachedOrigin;
    } catch {
      cachedOrigin = base;
      return cachedOrigin;
    }
  }

  if (base === "" || base === "/api") {
    cachedOrigin = "http://127.0.0.1:4000";
    return cachedOrigin;
  }

  if (base.endsWith("/api")) {
    const prefix = base.slice(0, -4) || "/";
    if (ABSOLUTE_URL_REGEX.test(prefix)) {
      cachedOrigin = sanitizeTrailingSlash(prefix);
      return cachedOrigin;
    }
    if (typeof window !== "undefined" && window.location) {
      const origin = sanitizeTrailingSlash(window.location.origin);
      if (prefix === "/" || prefix === "") {
        cachedOrigin = origin;
      } else {
        cachedOrigin = sanitizeTrailingSlash(
          `${origin}${prefix.startsWith("/") ? prefix : `/${prefix}`}`,
        );
      }
      return cachedOrigin;
    }
    cachedOrigin = prefix === "/" ? "" : sanitizeTrailingSlash(prefix);
    return cachedOrigin;
  }

  if (typeof window !== "undefined" && window.location) {
    const origin = sanitizeTrailingSlash(window.location.origin);
    if (!base) {
      cachedOrigin = origin;
    } else {
      const suffix = base.startsWith("/") ? base : `/${base}`;
      cachedOrigin = sanitizeTrailingSlash(`${origin}${suffix}`);
    }
    return cachedOrigin;
  }

  cachedOrigin = sanitizeTrailingSlash(base) || "";
  return cachedOrigin;
}

type CacheBusterOptions = {
  cacheBuster?: number;
};

function appendCacheBuster(url: string, options?: CacheBusterOptions): string {
  try {
    const parsed = new URL(url);
    const existing = parsed.searchParams.get("v");
    const value =
      options?.cacheBuster !== undefined
        ? String(options.cacheBuster)
        : existing ?? String(Date.now());
    parsed.searchParams.set("v", value);
    return parsed.toString();
  } catch {
    const existingMatch = url.match(/([?&])v=([^&#]+)/);
    const value =
      options?.cacheBuster !== undefined
        ? String(options.cacheBuster)
        : existingMatch?.[2] ?? String(Date.now());
    if (existingMatch) {
      return url.replace(existingMatch[0], `${existingMatch[1]}v=${value}`);
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${value}`;
  }
}

export function normalizeAvatarUrl(
  input?: string | null,
  options?: CacheBusterOptions,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    return appendCacheBuster(trimmed, options);
  }

  const origin = sanitizeTrailingSlash(resolveBackendOrigin());
  if (!origin) {
    return appendCacheBuster(trimmed, options);
  }

  if (trimmed.startsWith("/")) {
    return appendCacheBuster(`${origin}${trimmed}`, options);
  }

  return appendCacheBuster(`${origin}/${trimmed.replace(/^\/+/, "")}`, options);
}
