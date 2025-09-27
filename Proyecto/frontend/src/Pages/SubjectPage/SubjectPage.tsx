// SubjectPage.tsx — Página pública de una materia:
// - Lee el :subjectId (idealmente el "slug") desde la URL.
// - Busca la materia en el subjectsStore (lo que editas en el Admin).
// - Usa el bannerUrl subido desde el Admin; si no hay, cae a tu GIF por defecto.
// - Muestra actividades "mock" por materia (puedes migrarlas a backend luego).

import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";


// Navbar y estilos existentes
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./SubjectPage.module.css";

// 🔗 Store de materias (Fase 1: mock persistido en localStorage)
// Update the import path if the file is located elsewhere, for example:
import { useSubjectsStore } from "../../stores/subjectsStore";

// ✅ Store de app para saber si el usuario es admin
import {
  DEFAULT_ACTIVITIES_BY_SLUG,
  SubjectActivity,
} from "../../Lib/activityMocks";
import { normalizeSubjectSlug } from "../../utils/subjects";

const DEFAULT_HERO_BY_SLUG: Record<string, string> = {
  historia: "/Gifs/3banner.gif",
  quimica: "/Gifs/6banner.gif",
  matematicas: "/Gifs/8banner.gif",
};

export default function SubjectPage() {
  // ===============================================
  // 2) Param y normalización del slug
  // ===============================================
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const slug = useMemo(() => normalizeSubjectSlug(subjectId), [subjectId]);

  // ===============================================
  // 3) Store: traemos materias y refrescamos si hace falta
  // ===============================================
  const { items, list } = useSubjectsStore();

  // En Fase 1 (mock) "list" no pega a un backend, pero deja listo el patrón.
  useEffect(() => {
    if (!items || items.length === 0) list();
  }, [items, list]);

  // Busca la materia por slug
  const subject = items.find((s) => s.slug.toLowerCase() === slug);

  // Determina el título y el banner a mostrar:
  const title = subject?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const bannerUrl =
    subject?.bannerUrl ??
    DEFAULT_HERO_BY_SLUG[slug] ??
    "/Gifs/8banner.gif";

  // Actividades: mock por slug (hasta que migres a backend)
  const activities: SubjectActivity[] = DEFAULT_ACTIVITIES_BY_SLUG[slug] ?? [];

  const handleActivityActivate = (activity: SubjectActivity) => {
    const target = activity.linkTo?.trim();
    if (!target) return;

    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(target);
  };

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
          style={{ backgroundImage: `url('${bannerUrl}')` }}
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
              {filteredActivities.map((activity) => {
                const hasLink = !!activity.linkTo;
                const isExternal = hasLink && /^https?:\/\//i.test(activity.linkTo!);

                return (
                  <article
                    key={activity.id}
                    className={`${styles.card} ${
                      hasLink ? styles.cardInteractive : styles.cardDisabled
                    }`}
                    role="listitem"
                    tabIndex={hasLink ? 0 : -1}
                    aria-disabled={hasLink ? undefined : true}
                    title={activity.title}
                    onClick={() => hasLink && handleActivityActivate(activity)}
                    onKeyDown={(e) => {
                      if (!hasLink) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleActivityActivate(activity);
                      }
                    }}
                  >
                    <div className={styles.cardThumb} />
                    <h3 className={styles.cardTitle}>{activity.title}</h3>
                    <span
                      className={hasLink ? styles.cardAction : styles.cardActionDisabled}
                    >
                      {hasLink
                        ? isExternal
                          ? "Abrir recurso"
                          : "Ver actividad"
                        : "Sin enlace disponible"}
                    </span>
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
