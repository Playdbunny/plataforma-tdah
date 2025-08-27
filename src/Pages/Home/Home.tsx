// src/Pages/Home/Home.tsx
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";
import styles from "./Home.module.css";

export default function Home() {
  const navigate = useNavigate();
  const setTdahType = useAppStore((s) => s.setTdahType);

  const start = () => {
    setTdahType(null);
    navigate("/tdah");
  };

  return (
    <>
      {/* El navbar va fuera del hero, así ocupa su altura normal */}
      <Navbar />

      <section className={styles.hero} aria-label="Portada SynapQuest">
        {/* FONDO EN CAPAS */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.mountains}`} />
          <div className={`${styles.layer} ${styles.hills}`} />
          <div className={`${styles.layer} ${styles.grass}`} />
        </div>

        {/* CONTENIDO CENTRADO */}
        <div className={styles.center}>
          <h1 className={styles.title}>
            <span className={styles.titleFill}>SynapQuest</span>
          </h1>

          <p className={styles.subtitle}>
            Emprende tu aventura hacia un aprendizaje personalizado para ti!
          </p>

          {/* contenedor con borde pixelado */}
          <div className={styles.ctaPanel}>
            <div className={styles.btnRow}>
              <button className={`${styles.pxBtn} ${styles.btnYellow}`} 
                onClick={start}>
                Iniciar aventura
              </button>
              <button
                className={`${styles.pxBtn} ${styles.btnCyan}`}
                onClick={() => navigate("/login")}
              >
                Continuar aventura
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}



