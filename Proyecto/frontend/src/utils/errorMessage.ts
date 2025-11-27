export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;

  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;

  const anyErr = err as any;
  const candidate =
    anyErr?.response?.data?.error ??
    anyErr?.response?.data?.message ??
    anyErr?.message;

  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate.message === "string") return candidate.message;

  return fallback;
}