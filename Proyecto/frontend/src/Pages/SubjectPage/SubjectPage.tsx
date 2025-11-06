// SubjectPage.tsx — Página pública de una materia:
// - Lee el :subjectId (idealmente el "slug") desde la URL.
// - Busca la materia en el subjectsStore (lo que editas en el Admin).
// - Usa el bannerUrl subido desde el Admin; si no hay, cae a tu GIF por defecto.
// - Muestra actividades "mock" por materia (puedes migrarlas a backend luego).

import { useParams, Navigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";


// Navbar y estilos existentes
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./SubjectPage.module.css";

// 🔗 Store de materias (Fase 1: mock persistido en localStorage)
// Update the import path if the file is located elsewhere, for example:
import { useSubjectsStore } from "../../stores/subjectsStore";
import { useActivitiesStore, type PublicActivity } from "../../stores/activitiesStore";

// ✅ Store de app para saber si el usuario es admin
import { normalizeSubjectSlug } from "../../utils/subjects";

export default function SubjectPage() {
  // ===============================================
  // 2) Param y normalización del slug
  // ===============================================
  const { subjectId } = useParams<{ subjectId: string }>();
  const slug = useMemo(() => normalizeSubjectSlug(subjectId), [subjectId]);

  // ===============================================
  // 3) Store: traemos materias y refrescamos si hace falta
  // ===============================================
  const subjects = useSubjectsStore((state) => state.items);
  const fetchSubjects = useSubjectsStore((state) => state.fetchSubjects);
  const subjectsVersion = useSubjectsStore((state) => state.version);

  // En Fase 1 (mock) "list" no pega a un backend, pero deja listo el patrón.
  useEffect(() => {
    fetchSubjects().catch(() => {});
  }, [fetchSubjects, subjectsVersion]);

  // Busca la materia por slug
  const subject = subjects.find((s) => s.slug.toLowerCase() === slug);

  // Determina el título y el banner a mostrar:
  const title = subject?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const heroBannerUrl = subject?.bannerUrl ?? "/Gifs/8banner.gif";
  const defaultActivityBanner = heroBannerUrl;

  // Actividades: mock por slug (hasta que migres a backend)
  const activities = useActivitiesStore(
    (state) => state.activitiesBySubject[slug] ?? [],
  ) as PublicActivity[];
  const fetchActivities = useActivitiesStore((state) => state.fetchActivities);
  const activitiesVersion = useActivitiesStore((state) => state.version);

  useEffect(() => {
    if (!slug) return;
    fetchActivities(slug).catch(() => {});
  }, [slug, fetchActivities, activitiesVersion]);

  const [query, setQuery] = useState("");
  const filteredActivities = activities.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  // Si no hay slug válido, redirige a listado
  if (!slug) return <Navigate to="/subjects" replace />;

  // ===============================================
  // 5) Render
  // ===============================================
  return (
    <div className={styles.screen}>
      <Navbar homeOnly={false} items={[{ label: "Materias", to: "/subjects" }]} />

      {/* HERO */}
      <section className={styles.hero} aria-label={`Banner de ${title}`}>
        <div
          className={styles.heroArt}
          aria-hidden
          style={{ backgroundImage: `url("${heroBannerUrl}")` }}
        />
        <div className={styles.heroText}>
          <h1 className={styles.title}>{title}</h1>
        </div>
      </section>

      <main className={styles.container}>
        <div className={styles.sectionHead}>
          <span className={styles.rule} aria-hidden />
          <span className={styles.chip} role="heading" aria-level={2}>
            Actividades
          </span>
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar actividades"
          />
        </div>

        <section className={styles.tray} aria-label={`Actividades de ${title}`}>
          {filteredActivities.length === 0 ? (
            <div className={styles.empty}>Aún no hay actividades para esta materia.</div>
          ) : (
            <div className={styles.grid} role="list">
              {filteredActivities.map((a) => {
                const cardBanner = a.bannerUrl ?? defaultActivityBanner;

                return (
                  <article
                    key={a.id}
                    className={styles.card}
                    role="listitem"
                    tabIndex={0}
                    title={a.title}
                  >
                    <img
                      className={styles.cardThumb}
                      src={cardBanner}
                      alt={`Banner de ${a.title}`}
                      loading="lazy"
                    />
                    <h3 className={styles.cardTitle}>{a.title}</h3>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} SynapQuest</span>
      </footer>
    </div>
  );
}
