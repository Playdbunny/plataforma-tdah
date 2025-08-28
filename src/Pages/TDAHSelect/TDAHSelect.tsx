import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";
import styles from "./TdahSelect.module.css";

// Definimos los tres tipos de TDAH posibles
type TdahType = "inatento" | "hiperactivo" | "combinado";

export default function TdahSelect() {
  /* Bloquea el scroll*/
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  const navigate = useNavigate();
  const setTdahType = useAppStore((s) => s.setTdahType);

  // Función para seleccionar tipo de TDAH
  const pick = (t: TdahType) => {
    setTdahType(t);        // guarda el valor en Zustand (y se persiste gracias a persist)
    navigate("/register"); // luego navega a la pantalla de registro
  };

  return (
    <>
      {/* Navbar fijo arriba */}
      <Navbar />

      <section className={styles.hero} aria-label="Elige tu tipo de TDAH">
        {/* ===== FONDO EN CAPAS (igual que Home) ===== */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.mountains}`} />
          <div className={`${styles.layer} ${styles.hills}`} />
          <div className={`${styles.layer} ${styles.grass}`} />
        </div>

        {/* ===== CONTENIDO PRINCIPAL ===== */}
        <div className={styles.center}>
          <h1 className={styles.title}>ELIGE TU TIPO</h1>
          <p className={styles.subtitle}>Hay tres tipos de TDAH</p>

          {/* Botones (cards) para elegir */}
          <div className={styles.grid}>
            <button className={styles.card} onClick={() => pick("inatento")}>
              Inatento
            </button>
            <button className={styles.card} onClick={() => pick("hiperactivo")}>
              Hiperactivo
            </button>
            <button className={styles.card} onClick={() => pick("combinado")}>
              Combinado
            </button>
          </div>
        </div>
      </section>
    </>
  );
}


