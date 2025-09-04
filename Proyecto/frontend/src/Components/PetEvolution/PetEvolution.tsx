import { useMemo } from "react";
import styles from "./PetEvolution.module.css";
import { useAppStore } from "../../stores/appStore";

// ──────────────────────────────────────────────
// Configuración de etapas por XP
// ──────────────────────────────────────────────
type Stage = "egg" | "baby" | "juvenile" | "adult" | "special";

type StageCfg = {
  id: Stage;
  minXp: number;
  label: string;
  sprite: string; // ruta al PNG/GIF
};

const STAGES: StageCfg[] = [
  { id: "egg",      minXp: 0,    label: "Huevo",     sprite: "/mascota/dino_egg.gif" },
  { id: "baby",     minXp: 100,  label: "Bebé",      sprite: "/mascota/dino_baby.gif" },
  { id: "juvenile", minXp: 300,  label: "Juvenil",   sprite: "/mascota/dino_juvenile.gif" },
  { id: "adult",    minXp: 600,  label: "Adulto",    sprite: "/mascota/dino_adult.gif" },
  { id: "special",  minXp: 1000, label: "Especial",  sprite: "/mascota/dino_special.gif" },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function resolveStage(xp: number): StageCfg {
  let current = STAGES[0];
  for (const s of STAGES) {
    if (xp >= s.minXp) current = s;
  }
  return current;
}

function nextStageOf(current: StageCfg) {
  const idx = STAGES.findIndex((s) => s.id === current.id);
  return STAGES[idx + 1] ?? null;
}

function progressWithinStage(xp: number, current: StageCfg) {
  const nxt = nextStageOf(current);
  const currentStart = current.minXp;
  const nextStart = nxt ? nxt.minXp : current.minXp;
  const span = Math.max(1, nextStart - currentStart);
  const gained = Math.max(0, xp - currentStart);
  const pct = nxt ? Math.min(100, Math.round((gained / span) * 100)) : 100;
  const remaining = nxt ? Math.max(0, nextStart - xp) : 0;
  return { pct, currentStart, nextStart, remaining };
}

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
export default function PetEvolution() {
  const xp = useAppStore((s) => s.user?.xp ?? 0);
  const level = useAppStore((s) => s.user?.level ?? 1);

  const current = useMemo(() => resolveStage(xp), [xp]);
  const next = useMemo(() => nextStageOf(current), [current]);
  const prog = useMemo(() => progressWithinStage(xp, current), [xp, current]);

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <span className={styles.title}>
          {next
            ? `Faltan ${prog.remaining} XP para evolucionar a ${next.label}`
            : "¡Has alcanzado la etapa máxima!"}
        </span>
        <span className={styles.meta}>
          Nivel {level} · XP {xp}
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

      <div className={styles.progressWrap} aria-label="Progreso dentro de la etapa">
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${prog.pct}%` }} />
        </div>
        <div className={styles.progressMeta}>
          {next && <span>{xp}/{next.minXp} XP</span>}
        </div>
      </div>
    </section>
  );
}
