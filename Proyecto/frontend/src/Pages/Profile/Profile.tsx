import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";
import { useAppStore } from "../../stores/appStore";
import Navbar from "../../Components/Navbar/Navbar";
import XPBar from "../../Components/XPBar/XPBar";
import PetEvolution from "../../Components/PetEvolution/PetEvolution";

type Stat = { label: string; value: number; icon?: string; accent?: "blue"|"orange"|"green"|"pink" };

// Sprite por defecto (si el usuario aún no eligió personaje)
const DEFAULT_CHARACTER = {
  id: "bunny",
  name: "Bunny",
  sprite: "/characters/bunny_idle.png",
};

export default function Profile() {
  const navigate = useNavigate();

  // Fuente de verdad ÚNICA en front:
  const user = useAppStore((s: any) => s.user);

  // Derivados con defaults para render
  const level   = user?.level    ?? 1;
  const xp      = user?.xp       ?? 0;
  const nextXp  = user?.nextXp   ?? 1000;
  const name    = user?.name     ?? "Player";
  const tdah    = user?.tdahType ?? "Hiperactivo";
  const sprite  = user?.character?.sprite ?? DEFAULT_CHARACTER.sprite;
  const charName = user?.character?.name  ?? DEFAULT_CHARACTER.name;

  const stats: Stat[] = useMemo(() => ([
    { label: "EXERCISES",     value: 0, icon: "💠", accent: "blue"   },
    { label: "TOTAL  XP",     value: 0, icon: "🔥", accent: "orange" },
    { label: "COURSE BADGES", value: 0, icon: "🟢", accent: "green"  },
    { label: "DAILY  STREAK", value: 0, icon: "✨", accent: "pink"   },
  ]), []);

  return (
    <>
      <Navbar items={[{ label: "Materias", to: "/subjects" }]} />

      <div className={styles.screen}>
        {/* CARD PRINCIPAL */}
        <section className={styles.heroCard}>
          <div className={styles.banner}>
            <img src="/Gifs/banner-image.gif" alt="" />
          </div>

          <div className={styles.heroBody}>
            {/* Personaje (sprite) */}
            <img
              className={styles.avatar}
              src={sprite}
              alt={charName}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_CHARACTER.sprite; }}
            />

            {/* Info */}
            <div className={styles.info}>
              <div className={styles.row}>
                <span className={styles.diamond}>💎</span>
                <span className={styles.levelLabel}>Level {level}</span>

                {/* Barra de experiencia reutilizable */}
                <XPBar currentXP={xp} requiredXP={nextXp} />
              </div>

              <div className={styles.row}>
                <span className={styles.star}>⭐</span>
                <span className={styles.username}>{name}</span>
                <span className={styles.flag}>🚩</span>
                <span className={styles.tdahType}>{tdah}</span>
              </div>
            </div>

            {/* Edit */}
            <button
              className={styles.editBtn}
              onClick={() => navigate("/profile/edit")}
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* STATS */}
        <section className={styles.statsWrap}>
          <div className={styles.statsHeader}>Stats</div>
          <div className={styles.statsGrid}>
            {stats.map((s) => (
              <div key={s.label} className={`${styles.statCard} ${styles[s.accent ?? "blue"]}`}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statValue}>
                  <span className={styles.statIcon}>{s.icon}</span>
                  <span>{s.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <PetEvolution />
      </div>
    </>
  );
}
