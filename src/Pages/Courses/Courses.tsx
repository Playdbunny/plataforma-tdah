// ─────────────────────────────────────────────────────────────
// Courses.tsx
// Página de “Cursos” con:
//  - Hero superior con título y subtítulo.
//  - Grid de tarjetas CourseCard (banner, eyebrow, título, descripción y CTA).
//  - Uso de tu Navbar mostrando menú SOLO aquí (items + homeOnly={false}).
// ─────────────────────────────────────────────────────────────
import Navbar from "../../Components/Navbar/Navbar";   // ← Tu Navbar
import FancyCourseCard from "../../Components/FancyCourseCard/FancyCourseCard"; // ← Nueva card limpia
import styles from "./Courses.module.css";             // ← Estilos locales

type Course = {
  id: string;
  title: string;
  blurb: string;
  image: string;  // 🔹 aquí pones tus banners
  path: string;
};

const courses: Course[] = [
  {
    id: "Htry-01",
    title: "Historia",
    blurb: "Lorem ipsum dolor sit amet.",
    image: "/Gifs/3banner.gif",  // 🔹 aquí pones tus banners
    path: "/subjects/historia",
  },
  {
    id: "Chm-02",
    title: "Quimica",
    blurb: "Lorem ipsum dolor sit amet.",
    image: "/Gifs/6banner.gif",
    path: "/subjects/quimica",
  },
  {
    id: "Mths-01",
    title: "Matemáticas",
    blurb: "Lorem ipsum dolor sit amet.",
    image: "/Gifs/8banner.gif",
    path: "/subjects/matematicas",
  },
];

export default function Courses() {
  return (
    <div className={styles.screen}>
      <Navbar
        homeOnly={false}
        items={[{ label: "Materias", to: "/courses" }]}
        avatarSrc="/public/default-profile.jpg"   // ruta a la imagen en /public
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
        <h2 className={styles.sectionTitle}>The Lorem <span>ipsum</span></h2>
        <p className={styles.sectionLead}>
          lorem ipsum dolor sit amet.
        </p>

        {/* Grid responsive 1→2→3 columnas */}
        <div className={styles.grid}>
          {courses.map((c, i) => (
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


