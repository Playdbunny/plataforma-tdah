// ─────────────────────────────────────────────────────────────
// Courses.tsx
// Página de “Cursos” que toma las materias desde subjectsStore.
// - Mantiene tu Navbar y el hero actual.
// - Reemplaza el array hardcodeado por items del store.
// - Usa el banner subido en Admin (bannerUrl) o un GIF de fallback por slug.
// - Cada card navega a /subjects/:slug
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import FancyCourseCard from "../../Components/FancyCourseCard/FancyCourseCard";
import styles from "./Courses.module.css";

// 👇 Store con las materias creadas/gestionadas en Admin
import { useContentVersionStore } from "../../stores/contentVersionStore";
import { useSubjectsStore } from "../../stores/subjectsStore";

export default function Courses() {
  // Leemos materias del store + acción para “listar”
  const items = useSubjectsStore((state) => state.items);
  const fetchSubjects = useSubjectsStore((state) => state.fetchSubjects);
  const version = useContentVersionStore((state) => state.version);

  // Forzamos refetch cuando cambie la versión global de contenido
  useEffect(() => {
    fetchSubjects({ force: true }).catch(() => {});
  }, [fetchSubjects, version]);

  useEffect(() => {
    let timeoutId: number | undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          fetchSubjects({ force: true }).catch(() => {});
        }, 200);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [fetchSubjects]);

  return (
    <div className={styles.screen}>
      {/* Navbar con menú visible en Courses */}
      <Navbar
        homeOnly={false}
        items={[{ label: "Materias", to: "/courses" }]}
        avatarSrc="/Images/default-profile.jpg"
      />

      {/* HERO superior (igual al tuyo) */}
      <section className={styles.hero}>
        <div className={styles.heroArt} aria-hidden="true" />
        <div className={styles.heroText}>
          <p className={styles.kicker}>Explora el mundo de</p>
          <h1 className={styles.title}>SynapQuest</h1>
          <p className={styles.subtitle}>
            Empieza tu viaje con materias preparadas solo para ti.
          </p>
        </div>
      </section>

      <main className={styles.container}>
        <h2 className={styles.sectionTitle}>
          Catálogo de <span>materias</span>
        </h2>
        <p className={styles.sectionLead}>Elige una materia para comenzar tu aprendizaje.</p>

        {/* Estado vacío: invita a crear materias en Admin */}
        {(!items || items.length === 0) && (
          <div className={styles.empty}>
            Aún no hay materias. Crea alguna en <a href="/admin/gestion/materias">Admin → Materias</a>.
          </div>
        )}

        {/* Grid responsive 1→2→3 columnas */}
        <div className={styles.grid}>
          {items.map((s) => {
            // Banner: primero el subido en Admin, si no, fallback por slug, si no, genérico
            const banner = s.bannerUrl || "/Gifs/8banner.gif";

            return (
              <FancyCourseCard
                key={s._id ?? s.id}
                to={`/subjects/${s.slug}`}          // 👉 navega a la página pública de la materia
                eyebrow="MATERIA"
                title={s.name}
                description={s.description ?? "Lorem ipsum dolor sit amet."}
                bannerSrc={banner}
              />
            );
          })}
        </div>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} SynapQuest</span>
      </footer>
    </div>
  );
}
