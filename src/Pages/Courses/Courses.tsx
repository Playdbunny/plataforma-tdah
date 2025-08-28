// ─────────────────────────────────────────────────────────────
// Courses.tsx
// Página de “Cursos” con:
//  - Hero superior con título y subtítulo.
//  - Grid de tarjetas CourseCard (banner, eyebrow, título, descripción y CTA).
//  - Uso de tu Navbar mostrando menú SOLO aquí (items + homeOnly={false}).
// ─────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";        // ← Para navegación programática
import Navbar from "../../Components/Navbar/Navbar";   // ← Tu Navbar
import FancyCourseCard from "../../Components/FancyCourseCard/FancyCourseCard"; // ← Nueva card limpia
import styles from "./Courses.module.css";             // ← Estilos locales

type Materia = {
  id: string;
  title: string;
  blurb: string;
  image: string;  // 🔹 aquí pones tus banners
  path: string;
};

const Materias: Materia[] = [
  {
    id: "Hry-01",
    title: "Historia",
    blurb: "Lorem ipsum dolor sit amet.",
    image: "/public/Gifs/3banner.gif",  // 🔹 aquí pones tus banners
    path: "/course/python",
  },
  {
    id: "Chm-01",
    title: "Quimica",
    blurb: "Lorem ipsum dolor sit amet.",
    image: "/public/Gifs/6banner.gif",  // 🔹 aquí pones tus banners
    path: "/course/intermediate-python",
  },
  {
    id: "Mth-01",
    title: "Matematicas",
    blurb: "Lorem ipsum dolor sit amet.",
    image: "/public/Gifs/8banner.gif",
    path: "/course/numpy",
  },
];

export default function Courses() {
  return (
    <div className={styles.screen}>
      <Navbar
        homeOnly={false}
        items={[
          { label: "Perfil", to: "/profile" },
          { label: "Materias", to: "/courses" }
        ]}
      />

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
        <h2 className={styles.sectionTitle}>The lorem <span>ipsum</span></h2>
        <p className={styles.sectionLead}>
          Cursos diseñados adaptados a tus habilidades y conocimientos.
        </p>

        {/* Grid responsive 1→2→3 columnas */}
        <div className={styles.grid}>
          {Materias.map((c) => (
            <FancyCourseCard
              key={c.id}
              to={c.path}
              eyebrow={`MATERIA`}
              title={c.title}
              description={c.blurb}
              bannerSrc={c.image}                          /* 👈 tu banner */
            />
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} SynapQuest</span>
      </footer>
    </div>
  );
}


