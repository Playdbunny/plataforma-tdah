export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 0) return "—";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return "ahora";
  }
  if (minutes < 60) {
    const unit = minutes === 1 ? "minuto" : "minutos";
    return `hace ${minutes} ${unit}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const unit = hours === 1 ? "hora" : "horas";
    return `hace ${hours} ${unit}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    const unit = days === 1 ? "día" : "días";
    return `hace ${days} ${unit}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    const unit = months === 1 ? "mes" : "meses";
    return `hace ${months} ${unit}`;
  }

  const years = Math.floor(days / 365);
  const unit = years === 1 ? "año" : "años";
  return `hace ${years} ${unit}`;
}
