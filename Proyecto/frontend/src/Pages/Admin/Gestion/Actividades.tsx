// src/Pages/Admin/Gestion/Actividades.tsx
// ============================================================================
// Vista de "Actividades" dentro del panel de administración.
// Muestra tarjetas por cada materia registrada en subjectsStore.
// Cada tarjeta refleja los datos actuales, por lo que al crear/eliminar una
// materia desde la pestaña de Materias se actualiza automáticamente esta vista.
// ============================================================================

import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";

import styles from "./Actividades.module.css";
import { useSubjectsStore } from "../../../stores/subjectsStore";
import { useBackendReady } from "@/Hooks/useBackendReady";

export default function ActividadesPage() {
  const ready = useBackendReady();
  const items = useSubjectsStore((state) => state.items);
  const fetchSubjects = useSubjectsStore((state) => state.fetchSubjects);
  const version = useSubjectsStore((state) => state.version);

  // Si el store todavía no tiene materias (p.ej. primera carga en un navegador
  // nuevo), pedimos la lista mock para hidratar la vista.
  useEffect(() => {
    if (!ready) return;
    fetchSubjects().catch(() => {});
  }, [fetchSubjects, ready, version]);

  // Orden alfabético estable para que la grilla sea más predecible.
  const subjects = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [items]
  );

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p style={{ opacity: 0.8 }}>Conectando al servidor…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Actividades</h1>
        <p className={styles.subtitle}>
          Visualiza las materias disponibles y accede rápidamente a sus
          actividades para gestionarlas.
        </p>
      </header>

      {subjects.length === 0 ? (
        <div className={styles.empty}>
          Aún no hay materias registradas. Crea una desde la pestaña {" "}
          <Link to="/admin/materias">Materias</Link>.
        </div>
      ) : (
        <div className={styles.grid}>
          {subjects.map((subject) => {
            const background = subject.bannerUrl || "/Gifs/8banner.gif";

            return (
              <Link
                key={subject._id ?? subject.id}
                to={`/admin/actividades/${subject.slug}`}
                className={styles.card}
              >
                <span
                  className={styles.cardBackdrop}
                  style={{ backgroundImage: `url(${background})` }}
                  aria-hidden
                />
                <span className={styles.cardOverlay} aria-hidden />

                <span className={styles.cardContent}>
                  <span className={styles.cardLabel}>Materia</span>
                  <span className={styles.cardTitle}>{subject.name}</span>
                  {subject.description ? (
                    <span className={styles.cardDescription}>
                      {subject.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}