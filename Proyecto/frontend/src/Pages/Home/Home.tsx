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
      {/* Solo la marca arriba */}
      <Navbar homeOnly />

      <section className={styles.hero} aria-label="Portada SynapQuest">
        {/* ⬇️ MISMO FONDO EN CAPAS QUE TDAH (inline, sin componente) */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.mountains}`} />
          <div className={`${styles.layer} ${styles.hills}`} />
          <div className={`${styles.layer} ${styles.grass}`} />
        </div>

        {/* Contenido centrado */}
        <div className={styles.center}>
          {/* Título con gradiente dorado + borde oscuro sutil */}
          <h1 className={styles.title}>SynapQuest</h1>

          <p className={styles.subtitle}>
            Emprende tu aventura hacia un aprendizaje personalizado para ti!
          </p>

          <div className={styles.btnRow}>
            <button className={`${styles.pxBtn} ${styles.btnYellow}`} onClick={start}>
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
      </section>
    </>
  );
}
