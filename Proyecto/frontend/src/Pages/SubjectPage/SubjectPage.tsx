// SubjectPage.tsx — Página pública de una materia:
// - Lee el :subjectId (idealmente el "slug") desde la URL.
// - Busca la materia en el subjectsStore (lo que editas en el Admin).
// - Usa el bannerUrl subido desde el Admin; si no hay, cae a tu GIF por defecto.
// - Muestra actividades "mock" por materia (puedes migrarlas a backend luego).

import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";


// Navbar y estilos existentes
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./SubjectPage.module.css";

// 🔗 Store de materias (Fase 1: mock persistido en localStorage)
// Update the import path if the file is located elsewhere, for example:
import { useSubjectsStore } from "../../stores/subjectsStore";

// ✅ Store de app para saber si el usuario es admin
import { useAppStore } from "../../stores/appStore";


// Agrega el tipo de actividad para navegación
type Activity = { id: string; title: string; type?: string; thumb?: string };

const DEFAULT_HERO_BY_SLUG: Record<string, string> = {
  historia: "/Gifs/3banner.gif",
  quimica: "/Gifs/6banner.gif",
  matematicas: "/Gifs/8banner.gif",
};

const DEFAULT_ACTIVITIES_BY_SLUG: Record<string, Activity[]> = {
  historia: [
    { id: "a1", title: "Infografía-Primera Guerra Mundial", type: "infografia" },
    { id: "a2", title: "Quiz-El Feudalismo", type: "quiz" },
    { id: "a3", title: "PPT Animada-La crisis de la civilizacion occidental", type: "ppt-animada" },
    { id: "a4", title: "Video-La historia de Chile", type: "video" },
    { id: "a5", title: "Juego", type: "juego" },
  ],
  quimica: [
    { id: "b1", title: "Infografía", type: "infografia" },
    { id: "b2", title: "Quiz", type: "quiz" },
    { id: "b3", title: "PPT Animada", type: "ppt-animada" },
    { id: "b4", title: "Video", type: "video" },
    { id: "b5", title: "Juego", type: "juego" },
  ],
  matematicas: [
    { id: "c1", title: "Infografía-Algebra básica", type: "infografia" },
    { id: "c2", title: "Quiz-Algebra básica", type: "quiz" },
    { id: "c3", title: "PPT Animada - Álgebra básica", type: "ppt-animada" },
    { id: "c4", title: "Video-Algebra básica", type: "video" },
    { id: "c5", title: "Juego-Algebra básica", type: "juego" },
  ],
};

// Alias opcionales (por compatibilidad con rutas en inglés)
const ALIASES: Record<string, string> = {
  math: "matematicas",
  history: "historia",
  chem: "quimica",
};

export default function SubjectPage() {
  // ===============================================
  // 2) Param y normalización del slug
  // ===============================================
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const slug = useMemo(() => {
    const raw = (subjectId || "").toLowerCase();
    return ALIASES[raw] ?? raw; // convierte "math" -> "matematicas", etc.
  }, [subjectId]);

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
  const activities: Activity[] = DEFAULT_ACTIVITIES_BY_SLUG[slug] ?? [];

  const [query, setQuery] = useState("");
  const filteredActivities = activities.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  // Si no hay slug válido, redirige a listado
  if (!slug) return <Navigate to="/subjects" replace />;

  // ===============================================
  // 4) Saber si el usuario es admin
  // ===============================================
  const isAdmin =
    useAppStore((s) => s.isAdmin?.() ?? (s.user?.role === "admin"));

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
              {filteredActivities.map((a) => (
                <article
                  key={a.id}
                  className={styles.card}
                  role="listitem"
                  tabIndex={0}
                  title={a.title}
                  onClick={() => {
                    if (slug === "historia") navigate(`/historia/${a.type}`);
                    else if (slug === "matematicas") navigate(`/matematicas/${a.type}`);
                    else if (slug === "quimica") navigate(`/quimica/${a.type}`);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className={styles.cardThumb} />
                  <h3 className={styles.cardTitle}>{a.title}</h3>
                </article>
              ))}
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
