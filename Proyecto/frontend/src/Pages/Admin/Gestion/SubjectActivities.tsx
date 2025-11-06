// src/Pages/Admin/Gestion/SubjectActivities.tsx
// ============================================================================
// Admin de actividades por materia: búsqueda con debounce, contador de
// resultados, limpiar filtros, y ordenamiento. Mantiene los mocks actuales.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import styles from "./SubjectActivities.module.css";
import ActivityForm from "./ActivityForm";
import ActivityEditModal from "./ActivityEditModal";
import activityFormStyles from "./ActivityForm.module.css";
import { useSubjectsStore } from "../../../stores/subjectsStore";
import { useActivitiesStore } from "../../../stores/activitiesStore";
import {
  SUBJECT_ACTIVITY_STATUS_LABELS,
  SUBJECT_ACTIVITY_TYPE_LABELS,
  SubjectActivity,
  SubjectActivityType,
} from "../../../Lib/activityMocks";
import { normalizeSubjectSlug } from "../../../utils/subjects";

// Utilidad de formateo de fecha
function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Hook mínimo de debounce
function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type SortKey = "updatedDesc" | "titleAsc";

export default function SubjectActivitiesAdminPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const slug = useMemo(() => normalizeSubjectSlug(subjectId), [subjectId]);

  const subjects = useSubjectsStore((state) => state.items);
  const fetchSubjects = useSubjectsStore((state) => state.fetchSubjects);
  const subjectsVersion = useSubjectsStore((state) => state.version);

  const activities = useActivitiesStore((state) => state.adminItems);
  const fetchAdminActivities = useActivitiesStore((state) => state.fetchAdmin);
  const activitiesVersion = useActivitiesStore((state) => state.version);

  useEffect(() => {
    fetchSubjects().catch(() => {});
    fetchAdminActivities().catch(() => {});
  }, [fetchSubjects, fetchAdminActivities, subjectsVersion, activitiesVersion]);

  const subject = subjects.find((s) => s.slug.toLowerCase() === slug);
  const subjectName =
    subject?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);

  // Filtrar actividades por materia (subjectId o subjectSlug)
  const filteredBySubject = useMemo<SubjectActivity[]>(
    () => activities.filter((a) => {
      if (a.subjectId && subject?._id) return a.subjectId === subject._id;
      if (a.subjectSlug) return a.subjectSlug === slug;
      return false;
    }),
    [activities, slug, subject]
  );

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 250);
  const [typeFilter, setTypeFilter] = useState<SubjectActivityType | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<SortKey>("updatedDesc");
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<SubjectActivity|null>(null);
  // Mostrar formulario de nueva actividad

  const filteredActivities = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let result = filteredBySubject.filter((a) => {
      const matchesQuery =
        q.length === 0 || a.title.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      return matchesQuery && matchesType;
    });

    if (sortBy === "updatedDesc") {
      result = result.slice().sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } else {
      result = result.slice().sort((a, b) => a.title.localeCompare(b.title, "es"));
    }

    return result;
  }, [filteredBySubject, debouncedQuery, typeFilter, sortBy]);

  const typeOptions = useMemo(() => {
    const unique = new Set<SubjectActivityType>();
    filteredBySubject.forEach((a) => unique.add(a.type));
    return Array.from(unique);
  }, [filteredBySubject]);

  const hasActiveFilters = query.trim().length > 0 || typeFilter !== "all";

  if (!slug) return <Navigate to="/admin/actividades" replace />;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link to="/admin/actividades">← Volver a materias</Link>
        </div>

        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Actividades — {subjectName}</h1>
            <p className={styles.subtitle}>
              Administra el contenido publicado para esta materia. Puedes crear
              nuevas actividades, filtrarlas por tipo o buscar rápidamente.
            </p>
          </div>

          <button
            type="button"
            className={styles.newButton}
            aria-label="Crear nueva actividad"
            onClick={() => setShowForm(true)}
          >
            + Nueva Actividad
          </button>
          {showForm && (
            <div className={activityFormStyles.modalOverlay}>
              <ActivityForm subjectSlug={slug} onClose={() => setShowForm(false)} />
            </div>
          )}
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span className={styles.searchIcon} aria-hidden>
              🔍
            </span>
            <input
              type="search"
              placeholder="Buscar actividades…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar actividades"
            />
          </label>

          <label className={styles.filter}>
            <span>Filtro por tipo</span>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as SubjectActivityType | "all")
              }
              aria-label="Filtrar por tipo de actividad"
            >
              <option value="all">Todos los tipos</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {SUBJECT_ACTIVITY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.sort}>
            <span>Ordenar</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Ordenar resultados"
            >
              <option value="updatedDesc">Más recientes</option>
              <option value="titleAsc">Título (A–Z)</option>
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
              }}
            >
              Limpiar filtros
            </button>
          )}

          <div
            className={styles.resultCount}
            aria-live="polite"
            aria-atomic="true"
          >
            {filteredActivities.length} resultado
            {filteredActivities.length !== 1 ? "s" : ""}
          </div>
        </div>
      </header>

      <main>
        {filteredActivities.length === 0 ? (
          <div className={styles.empty} role="status" aria-live="polite">
            <p>
              No se encontraron actividades con los filtros actuales. Prueba a
              limpiar la búsqueda o cambia el tipo seleccionado.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredActivities.map((activity) => (
              <article key={activity.id} className={styles.card} tabIndex={0}>
                {activity.bannerUrl ? (
                  <div className={styles.cardBanner} aria-hidden>
                    <img src={activity.bannerUrl} alt="" />
                  </div>
                ) : null}
                <header className={styles.cardHeader}>
                  <span className={styles.cardType}>
                    {SUBJECT_ACTIVITY_TYPE_LABELS[activity.type]}
                  </span>
                  <span
                    className={`${styles.status} ${
                      styles[
                        `status${
                          activity.status.charAt(0).toUpperCase() +
                          activity.status.slice(1)
                        }`
                      ] ?? ""
                    }`}
                  >
                    {SUBJECT_ACTIVITY_STATUS_LABELS[activity.status]}
                  </span>
                </header>

                <h2 className={styles.cardTitle}>{activity.title}</h2>

                {activity.description ? (
                  <p className={styles.cardDescription}>{activity.description}</p>
                ) : null}

                <footer className={styles.cardFooter}>
                  <time dateTime={activity.updatedAt}>
                    Actualizado: {formatDate(activity.updatedAt)}
                  </time>
                  <button
                    type="button"
                    className={styles.manageButton}
                    onClick={() => setEditingActivity(activity)}
                  >
                    Administrar
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </main>
    {editingActivity && (
      <ActivityEditModal
        activity={editingActivity}
        onClose={() => setEditingActivity(null)}
      />
    )}
  </div>
  );
}
