// src/pages/Home.tsx
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAppStore, type TDAHType } from "../stores/appStore";
import styles from "./Home.module.css";

export default function Home() {
  const navigate = useNavigate();
  const setTdahType = useAppStore((s) => s.setTdahType);

  const handleSelect = (type: TDAHType) => {
    setTdahType(type);     // persiste en localStorage (zustand/persist)
    navigate("/Register");    // redirige al registro
  };

  return (
    <div className={styles.screen}>
      {/* NAV */}
      <div className={styles.navbar}>
        <a className={styles.brand} href="#Inicio">###</a>
        <nav className={styles.menu}>
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="#progress">Mi progreso</Link>
          <Link to="#subjects">Materias</Link>
        </nav>
      </div>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.titleBubble}>
          <h1 className={styles.title}>
            Bienvenido/a a <span className={styles.pixelShadow}>###</span>
          </h1>
        </div>

        <p className={styles.subtitleBubble}>
          ¿Qué tipo de <span className={styles.linkish}>TDAH</span> tienes?
        </p>

        {/* BOTONES */}
        <div className={styles.buttonsRow}>
          <button
            onClick={() => handleSelect("Inatento")}
            className={`${styles.btn} ${styles.btnPink}`}
          >
            Inatento
          </button>
          <button
            onClick={() => handleSelect("Hiperactivo-Impulsivo")}
            className={`${styles.btn} ${styles.btnGreen}`}
          >
            Hiperactivo-Impulsivo
          </button>
          <button
            onClick={() => handleSelect("Combinado")}
            className={`${styles.btn} ${styles.btnPurple}`}
          >
            Combinado
          </button>
        </div>
      </section>
    </div>
  );
}


