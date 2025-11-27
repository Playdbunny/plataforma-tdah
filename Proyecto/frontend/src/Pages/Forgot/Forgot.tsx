import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./Forgot.module.css";
import { requestPasswordReset } from "../../api/auth";
import { extractErrorMessage } from "../../utils/errorMessage";

export default function Forgot() {

  /* Bloquea el scroll */
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);    
    setError(null);

    try {
      await requestPasswordReset({ email });
      setSent(true);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          "No pudimos enviar el correo. Inténtalo nuevamente en unos minutos.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <section className={styles.screen} aria-label="Recuperar contraseña">
        {/* FONDO EN CAPAS */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.clouds}`} />
        </div>

        {/* CARD */}
        <div className={styles.card}>
          {!sent ? (
            <>
              <h1 className={styles.title}>¿Olvidaste tu contraseña?</h1>
              <p className={styles.desc}>
                No te preocupes: ingresa tu correo y te enviaremos un email de recuperación.
              </p>

              <form onSubmit={onSubmit} className={styles.form}>
                <label className={styles.inputWrap}>
                  <input
                    type="email"
                    placeholder="Correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.input}
                    autoComplete="email"
                  />
                </label>

                {error && <div className={styles.error}>{error}</div>}

                <button type="submit" className={`${styles.pxBtn} ${styles.btnCyan}`} disabled={loading}>
                  {loading ? "Enviando..." : "Recupera tu contraseña"}
                </button>
              </form>

              <Link to="/login" className={styles.back}>
                ← Volver a iniciar sesión
              </Link>
            </>
          ) : (
            <div className={styles.success}>
              <h2 className={styles.title}>¡Listo!</h2>
              <p className={styles.desc}>
                Si <b>{email}</b> existe en nuestro sistema, recibirás un correo con instrucciones.
              </p>
              <Link to="/login" className={`${styles.pxBtn} ${styles.btnCyan}`}>
                Volver al login
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
