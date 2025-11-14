const LOCALE = "es-CL";

export function formatMMSS(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) {
    return "00:00";
  }
  const total = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatShortNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const abs = Math.abs(value);
  if (abs < 1000) {
    return value.toLocaleString(LOCALE);
  }

  const format = (divisor: number, suffix: string) =>
    `${(value / divisor).toLocaleString(LOCALE, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${suffix}`;

  if (abs >= 1_000_000) {
    return format(1_000_000, "M");
  }

  return format(1_000, "k");
}
