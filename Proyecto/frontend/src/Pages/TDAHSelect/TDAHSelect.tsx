import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";
import type { TDAHType } from "../../stores/appStore";
import styles from "./TdahSelect.module.css";

export default function TdahSelect() {
  // Bloquea el scroll mientras está esta pantalla
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  const navigate = useNavigate();
  const setTdahType = useAppStore((s) => s.setTdahType);

  const options = useMemo(
    () =>
      ([
        { key: "inatento", label: "Inatento" },
        { key: "hiperactivo", label: "Hiperactivo" },
        { key: "combinado", label: "Combinado" },
      ] as { key: TDAHType; label: string }[]),
    []
  );

  const pick = (t: TDAHType) => {
    setTdahType(t);
    navigate("/register");
  };

  return (
    <>
      {/* Solo la marca arriba */}
      <Navbar homeOnly />

      <section className={styles.hero} aria-label="Elige tu tipo de TDAH">
        {/* Fondo en capas */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.mountains}`} />
          <div className={`${styles.layer} ${styles.hills}`} />
          <div className={`${styles.layer} ${styles.grass}`} />
        </div>

        {/* Contenido */}
        <div className={styles.center}>
          <h1 className={styles.title}>ELIGE TU TIPO</h1>
          <p className={styles.subtitle}>Hay tres tipos de TDAH</p>

          <div className={styles.grid}>
            {options.map((o) => (
              <button
                key={o.key}
                className={styles.card}
                onClick={() => pick(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}


