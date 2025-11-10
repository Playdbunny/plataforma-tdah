// src/lib/levels.ts
// =============================
// Utilidades compartidas para cálculos de XP/Niveles en el backend.
// Mantiene la misma regla utilizada en el frontend:
// - Nivel 1 requiere 1000 XP.
// - Cada nivel siguiente requiere 500 XP adicionales.

export function xpForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 1) return 1000;
  return 1000 + 500 * (Math.floor(level) - 1);
}

export function normalizeLevel(level: number | undefined | null): number {
  if (!Number.isFinite(level as number)) return 1;
  const normalized = Math.max(1, Math.floor(level as number));
  return normalized;
}

export function applyXpGain(
  level: number | undefined | null,
  xpInLevel: number | undefined | null,
  gainedXp: number,
): { level: number; xpInLevel: number } {
  let nextLevel = normalizeLevel(level);
  let currentXp = Math.max(0, Math.floor(xpInLevel ?? 0));
  let remaining = Math.max(0, Math.floor(gainedXp));

  while (remaining > 0) {
    const requiredForLevel = xpForLevel(nextLevel);
    const missing = Math.max(0, requiredForLevel - currentXp);

    if (missing <= 0) {
      nextLevel += 1;
      currentXp = 0;
      continue;
    }

    if (remaining >= missing) {
      remaining -= missing;
      nextLevel += 1;
      currentXp = 0;
    } else {
      currentXp += remaining;
      remaining = 0;
    }
  }

  return { level: nextLevel, xpInLevel: currentXp };
}

