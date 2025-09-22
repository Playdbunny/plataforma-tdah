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

// Imagen por defecto según el slug, igual que en Courses para mantener coherencia.
const DEFAULT_ART_BY_SLUG: Record<string, string> = {
  historia: "/Gifs/3banner.gif",
  quimica: "/Gifs/6banner.gif",
  matematicas: "/Gifs/8banner.gif",
};

export default function ActividadesPage() {
  const { items, list } = useSubjectsStore();

  // Si el store todavía no tiene materias (p.ej. primera carga en un navegador
  // nuevo), pedimos la lista mock para hidratar la vista.
  useEffect(() => {
    if (!items || items.length === 0) {
      list();
    }
  }, [items, list]);

  // Orden alfabético estable para que la grilla sea más predecible.
  const subjects = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [items]
  );

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
            const background =
              subject.bannerUrl ||
              DEFAULT_ART_BY_SLUG[subject.slug] ||
              "/Gifs/8banner.gif";

            return (
              <Link
                key={subject.id}
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