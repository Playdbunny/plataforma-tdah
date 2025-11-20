// src/Components/PetEvolution/PetEvolution.tsx
// Evolución por XP TOTAL acumulado, con umbrales por pares de niveles.
// - XP de nivel n: 1000 + (n-1)*500
// - Baby: niveles 1..2  (2500)
// - Juvenile: niveles 1..4 (7000)
// - Adult: niveles 1..6 (13500)
// - Special: niveles 1..8 (22000)

import { useMemo } from "react";
import styles from "./PetEvolution.module.css";
import { useAppStore } from "../../stores/appStore";
import {
  currentTotalXP,
  totalXPRequiredToReachLevel,
} from "../../Lib/Levels";

// ──────────────────────────────────────────────
// Config por etapas usando "metas acumuladas" por niveles:
//  egg      → se muestra siempre (desde 0 total)
//  baby     → al completar N2 (L1 + L2)
//  juvenile → al completar N4 (L1+L2+L3+L4)
//  adult    → al completar N6
//  special  → al completar N8
// Cambia estos "cap levels" si quieres hacerla más/menos exigente.
// ──────────────────────────────────────────────
type Stage = "egg" | "baby" | "juvenile" | "adult" | "special";

type StageCfg = {
  id: Stage;
  label: string;
  sprite: string;
  // nivel que hay que completar para "entrar" a la etapa:
  // p.ej. babyAt = 2 => necesitas L1+L2 acumulados.
  capLevel?: number; // undefined = 0 (egg)
};

const STAGES: StageCfg[] = [
  { id: "egg",      label: "Huevo",    sprite: "/mascota/dino_egg.gif" },
  { id: "baby",     label: "Bebé",     sprite: "/mascota/dino_baby.gif",     capLevel: 2 },
  { id: "juvenile", label: "Juvenil",  sprite: "/mascota/dino_juvenile.gif", capLevel: 4 },
  { id: "adult",    label: "Adulto",   sprite: "/mascota/dino_adult.gif",    capLevel: 6 },
  { id: "special",  label: "Especial", sprite: "/mascota/dino_special.gif",  capLevel: 8 },
];

// Retorna cuántos XP acumulados se requieren para “entrar” a una etapa.
// egg: 0; baby: total hasta L2; juvenile: total hasta L4; etc.
function requiredTotalForStage(s: StageCfg): number {
  if (!s.capLevel) return 0;
  return totalXPRequiredToReachLevel(s.capLevel);
}

// Dado un total XP, devuelve la etapa actual (la más alta alcanzada).
function resolveStageByTotal(totalXP: number): StageCfg {
  let current = STAGES[0];
  for (const s of STAGES) {
    const need = requiredTotalForStage(s);
    if (totalXP >= need) current = s;
  }
  return current;
}

// Etapa siguiente (si hay)
function nextStageOf(current: StageCfg): StageCfg | null {
  const idx = STAGES.findIndex((s) => s.id === current.id);
  return STAGES[idx + 1] || null;
}

// Progreso dentro de la etapa actual, respecto al umbral de la siguiente
function progressWithinStage(totalXP: number, current: StageCfg) {
  const base = requiredTotalForStage(current); // inicio de la etapa actual
  const next = nextStageOf(current);
  const target = next ? requiredTotalForStage(next) : base; // si no hay next, se queda
  const span = Math.max(1, target - base);
  const gained = Math.max(0, totalXP - base);
  const pct = next ? Math.min(100, Math.round((gained / span) * 100)) : 100;
  const remaining = next ? Math.max(0, target - totalXP) : 0;
  return { pct, base, target, remaining };
}

export default function PetEvolution() {
  // Del store (mantienes tu modelo actual):
  const level = useAppStore((s) => s.user?.level ?? 1);
  const xpInThisLevel = useAppStore((s) => s.user?.xp ?? 0);

  // XP TOTAL ACUMULADO (niveles previos + xp actual)
  const totalXP = useMemo(
    () => currentTotalXP(level, xpInThisLevel),
    [level, xpInThisLevel]
  );

  const current = useMemo(() => resolveStageByTotal(totalXP), [totalXP]);
  const next = useMemo(() => nextStageOf(current), [current]);
  const prog = useMemo(() => progressWithinStage(totalXP, current), [totalXP, current]);

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <span className={styles.title}>
          {next
            ? `Faltan ${prog.remaining} XP para evolucionar a ${next.label}`
            : "¡Has alcanzado la etapa máxima!"}
        </span>
        <span className={styles.meta}>
          Nivel {level} · XP total {totalXP}
        </span>
      </header>

      <div className={styles.row}>
        <figure className={styles.spriteBox}>
          <img
            className={`${styles.sprite} ${current.id === "egg" ? styles.shake : ""}`}
            src={current.sprite}
            alt={current.label}
            draggable={false}
          />
          <figcaption className={styles.caption}>{current.label}</figcaption>
        </figure>

        <div className={styles.arrow}>➜➜➜</div>

        <figure className={styles.spriteBox}>
          <img
            className={styles.sprite}
            src={next ? next.sprite : current.sprite}
            alt={next ? next.label : current.label}
            draggable={false}
            style={{ opacity: next ? 1 : 0.5 }}
          />
          <figcaption className={styles.caption}>{next ? next.label : "Máximo"}</figcaption>
        </figure>
      </div>

      <div className={styles.progressWrap} aria-label="Progreso hacia la siguiente etapa">
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${prog.pct}%` }} />
        </div>

        {/* Para que el usuario entienda el objetivo de esta barra */}
        {next && (
          <div className={styles.progressMeta}>
            <span>
              {totalXP} / {prog.target} XP totales
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
