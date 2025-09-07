// src/lib/levels.ts
// Helpers de XP/level para toda la app.
// Regla base: nivel 1 requiere 1000 XP, y cada nivel siguiente +500.
//  L1=1000, L2=1500, L3=2000, L4=2500, etc.

export function xpForLevel(level: number): number {
  if (level <= 1) return 1000;
  return 1000 + 500 * (level - 1);
}

// XP total acumulado necesario para COMPLETAR hasta "level" (incluido)
export function totalXPRequiredToReachLevel(level: number): number {
  let sum = 0;
  for (let i = 1; i <= level; i++) sum += xpForLevel(i);
  return sum;
}

// Dado el "level" actual y el xp dentro de ese nivel (0..xpForLevel(level)),
// calcula el total acumulado incluyendo niveles previos.
export function currentTotalXP(level: number, xpInThisLevel: number): number {
  const prevLevels = Math.max(0, level - 1);
  return totalXPRequiredToReachLevel(prevLevels) + Math.max(0, xpInThisLevel);
}
