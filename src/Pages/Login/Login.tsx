import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./Login.module.css";

export default function Login() {

  /* Bloquea el scroll */
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: conectar con tu backend / provider
    alert("Login demo (conecta tu auth aquí)");
  };

  return (
    <>
      <Navbar />
      <section className={styles.screen} aria-label="Inicio de sesión">
        {/* Fondo (assets en /public) */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.clouds}`} />
        </div>

        {/* Card */}
        <div className={styles.card} role="form">
          <button className={styles.googleBtn} type="button" onClick={() => alert("Google OAuth (demo)")}>
            <img src="/google.png" alt="" aria-hidden className={styles.gIcon} />
            Google
          </button>

          <div className={styles.divider}><span>o</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.inputWrap}>
              <input
                type="email"
                placeholder="Correo"
                required
                className={styles.input}
                autoComplete="email"
              />
            </label>

            <label className={styles.inputWrap}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Contraseña"
                required
                className={styles.input}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </label>

            <button type="submit" className={`${styles.pxBtn} ${styles.btnCyan}`}>
              Continúa tu aventura!
            </button>
          </form>

          <Link to="/forgot" className={styles.forgot}>¿Olvidaste tu contraseña?</Link>
        </div>
      </section>
    </>
  );
}
