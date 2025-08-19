import { Link } from "react-router-dom";
import styles from './Subjects.module.css';

export default function Subjects() {
  return (
    <div className={styles.screen}>
      {/* NAV */}
      <div className={styles.navbar}>
        <a className={styles.brand} href="#Inicio">###</a>
        <nav className={styles.menu}>
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="#progress">Mi progreso</Link>
          <Link to="/subjects">Materias</Link>
        </nav>
      </div>

        {/* CONTENIDO */}
        <main className={styles.content}>
            <h1 className={styles.title}>Materias</h1>
            <p className={styles.subtitle}>
                En esta sección podrás ver las materias disponibles y acceder a su contenido.
            </p>
            
            <section className={styles.subjectsCards}>
                <Link to={"/subject/math"} className={styles.subject}>
                    <div className={styles.thumb} />
                    <span className={styles.subjectTitle}>Matemáticas</span>
                </Link>

                <Link to={"/subject/history"} className={styles.subject}>
                    <div className={styles.thumb} />
                    <span className={styles.subjectTitle}>Historia</span>
                </Link>

                <Link to={"/subject/chemistry"} className={styles.subject}>
                    <div className={styles.thumb} />
                    <span className={styles.subjectTitle}>Química</span>
                </Link>
            </section>
        </main>
    </div>
  );
}