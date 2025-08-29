// SubjectPage.tsx — Hero + tray de actividades (ruta: /subjects/:subjectId)
import { useParams, Navigate } from "react-router-dom";
import { useRef, useCallback, useMemo } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./SubjectPage.module.css";

type Activity = { id: string; title: string; thumb?: string };
type SubjectConfig = { id: string; title: string; hero: string; activities: Activity[] };

const SUBJECTS: Record<string, SubjectConfig> = {
  historia: {
    id: "historia",
    title: "Historia",
    hero: "/Gifs/3banner.gif",
    activities: [
      { id: "a1", title: "Línea del tiempo" },
      { id: "a2", title: "Civilizaciones" },
      { id: "a3", title: "Mapa interactivo" },
      { id: "a4", title: "Quiz rápido" },
      { id: "a5", title: "Personajes clave" },
    ],
  },
  quimica: {
    id: "quimica",
    title: "Química",
    hero: "/Gifs/6banner.gif",
    activities: [
      { id: "b1", title: "Tabla periódica" },
      { id: "b2", title: "Enlaces químicos" },
      { id: "b3", title: "Reacciones" },
    ],
  },
  matematicas: {
    id: "matematicas",
    title: "Matemáticas",
    hero: "/Gifs/8banner.gif",
    activities: [
      { id: "c1", title: "Álgebra básica" },
      { id: "c2", title: "Geometría" },
      { id: "c3", title: "Fracciones" },
    ],
  },
};

// Alias para aceptar rutas en inglés también (opcional)
const ALIASES: Record<string, string> = {
  math: "matematicas",
  history: "historia",
  chem: "quimica",
};

export default function SubjectPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const normalizedKey = useMemo(() => {
    const raw = (subjectId || "").toLowerCase();
    return ALIASES[raw] ?? raw;
  }, [subjectId]);

  const subject = SUBJECTS[normalizedKey];
  if (!subject) return <Navigate to="/subjects" replace />;

  const stripRef = useRef<HTMLDivElement | null>(null);

  const next = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  const prev = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: -el.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  return (
    <div className={styles.screen}>
      <Navbar homeOnly={false} items={[{ label: "Materias", to: "/subjects" }]} />

      {/* HERO */}
      <section className={styles.hero} aria-label={`Banner de ${subject.title}`}>
        <div className={styles.heroArt} aria-hidden style={{ backgroundImage: `url('${subject.hero}')` }} />
        <div className={styles.heroText}>
          <h1 className={styles.title}>{subject.title}</h1>
        </div>
      </section>

      {/* CONTENIDO */}
      <main className={styles.container}>
        <div className={styles.sectionHead}>
          <span className={styles.rule} aria-hidden />
          <span className={styles.chip} role="heading" aria-level={2}>Actividades</span>
        </div>

        {/* TRAY */}
        <section className={styles.tray} aria-label={`Actividades de ${subject.title}`}>
          <div className={styles.actStrip} ref={stripRef} role="list">
            {subject.activities.length === 0 ? (
              <div className={styles.empty}>Aún no hay actividades para esta materia.</div>
            ) : (
              subject.activities.map((a) => (
                <article key={a.id} className={styles.actCard} role="listitem" tabIndex={0}>
                  <div className={styles.pill} />
                  <div className={styles.pillLabel} title={a.title}>{a.title}</div>
                </article>
              ))
            )}
          </div>

          <button className={`${styles.navBtn} ${styles.navPrev}`} aria-label="Anterior" onClick={prev}>‹</button>
          <button className={`${styles.navBtn} ${styles.navNext}`} aria-label="Siguiente" onClick={next}>›</button>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} SynapQuest</span>
      </footer>
    </div>
  );
}
