// src/Pages/Profile/Profile.tsx
// ─────────────────────────────────────────────────────────────
// Perfil del usuario (front-only):
// - Lee user del appStore (fuente de verdad en front).
// - Muestra nivel, barra XP (XPBar), y datos básicos.
// - Calcula el TOTAL XP real con currentTotalXP(level, xp).
// - Renderiza PetEvolution (progreso por etapas según XP total).
// - Stats conectadas a totalXP (el resto quedan como 0 por ahora).
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";

// Store (Zustand)
import { useAppStore } from "../../stores/appStore";

// Componentes UI ya creados
import Navbar from "../../Components/Navbar/Navbar";
import XPBar from "../../Components/XPBar/XPBar";
import PetEvolution from "../../Components/PetEvolution/PetEvolution";

// Helper de niveles/XP acumulada (ya creado en /Lib/Levels)
import { currentTotalXP, xpForLevel } from "../../Lib/Levels";

type Stat = {
  label: string;
  value: number;
  icon?: string;
  accent?: "blue" | "orange" | "green" | "pink";
};

// Sprite por defecto (si el usuario aún no eligió personaje)
const DEFAULT_CHARACTER = {
  id: "bunny",
  name: "Bunny",
  sprite: "/characters/bunny_idle.png",
};

function capitalize(word?: string | null) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export default function Profile() {
  const navigate = useNavigate();

  // ⚠️ Tip: usamos "any" para evitar que TS se queje si el tipo User
  // del store no declara todos los campos (p.ej., tdahType).
  const user = useAppStore((s: any) => s.user);

  // Derivados con defaults seguros para la UI
  const level    = user?.level    ?? 1;
  const xp       = user?.xp       ?? 0;
  const nextXp   = user?.nextXp   ?? xpForLevel(level);
  const name     = user?.name     ?? "Player";
  const tdah     = user?.tdahType ?? "Hiperactivo"; // si no existe, fallback visual
  const sprite   = user?.character?.sprite ?? DEFAULT_CHARACTER.sprite;
  const charName = user?.character?.name  ?? DEFAULT_CHARACTER.name;

  // ✅ TOTAL XP acumulado = suma niveles previos + xp actual de nivel en curso
  const totalXP = useMemo(() => {
    const provided = typeof user?.totalXp === "number" ? user.totalXp : null;
    if (typeof provided === "number" && Number.isFinite(provided)) {
      return Math.max(0, Math.round(provided));
    }
    return currentTotalXP(level, xp);
  }, [user?.totalXp, level, xp]);

  // Stats (por ahora 3 de ellas son mock=0; TOTAL XP sí es real)
  const stats: Stat[] = useMemo(
    () => [
      {
        label: "ACTIVITIES",
        value: user?.activitiesCompleted ?? 0,
        icon: "💠",
        accent: "blue",
      },
      { 
        label: "TOTAL  XP", 
        value: totalXP, 
        icon: "🔥", 
        accent: "orange" 
      },
      {
        label: "DAILY  STREAK",
        value: user?.streak?.count ?? 0,
        icon: "✨",
        accent: "pink",
      },
    ],
    [totalXP, user?.activitiesCompleted, user?.streak?.count]
  );

  return (
    <>
      {/* Sugerencia: en tu Navbar, el item "Materias" suele apuntar a /courses */}
      <Navbar items={[{ label: "Materias", to: "/courses" }]} />

      <div className={styles.screen}>
        {/* ===== CARD PRINCIPAL ===== */}
        <section className={styles.heroCard}>
          {/* Banner superior (puedes cambiar el gif cuando quieras) */}
          <div className={styles.banner}>
            <img src="/Gifs/banner-image.gif" alt="" />
          </div>

          <div className={styles.heroBody}>
            {/* Sprite del personaje */}
            <img
              className={styles.avatar}
              src={sprite}
              alt={charName}
              onError={(e) => {
                // fallback si falla la ruta del sprite
                (e.currentTarget as HTMLImageElement).src = DEFAULT_CHARACTER.sprite;
              }}
            />

            {/* Info principal */}
            <div className={styles.info}>
              {/* Fila: Nivel + barra XP */}
              <div className={styles.row}>
                <span className={styles.diamond}>💎</span>
                <span className={styles.levelLabel}>Level {level}</span>

                {/* Barra XP reutilizable */}
                <XPBar currentXP={xp} requiredXP={nextXp} />
              </div>

              {/* Fila: Nombre + "tipo" (placeholder TDAH) */}
              <div className={styles.row}>
                <span className={styles.star}>⭐</span>
                <span className={styles.username}>{name}</span>
                <span className={styles.flag}>🚩</span>
                <span className={styles.tdahType}>{capitalize(tdah)}</span>
              </div>
            </div>

            {/* Botón editar perfil */}
            <button className={styles.editBtn} onClick={() => navigate("/profile/edit")}>
              Editar Perfil
            </button>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className={styles.statsWrap}>
          <div className={styles.statsHeader}>Stats</div>
          <div className={styles.statsGrid}>
            {stats.map((s) => (
              <div key={s.label} className={`${styles.statCard} ${styles[s.accent ?? "blue"]}`}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statValue}>
                  <span className={styles.statIcon}>{s.icon}</span>
                  {/* formateamos grande (TOTAL XP puede crecer bastante) */}
                  <span>{Number(s.value).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== EVOLUCIÓN DE MASCOTA (usa XP total y reglas nuevas) ===== */}
        {/* Card de evolución con separación */}
        <div className={styles.petSection}>
          <PetEvolution />
        </div>

              </div>
    </>
  );
}
