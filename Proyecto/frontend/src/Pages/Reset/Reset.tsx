import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./Reset.module.css";
import { resetPassword } from "../../api/auth";

function useResetToken() {

  /* Bloquea el scroll */
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  const { token: paramToken } = useParams<{ token: string }>();
  const { search } = useLocation();
  const queryToken = new URLSearchParams(search).get("token");
  return useMemo(() => paramToken || queryToken || "", [paramToken, queryToken]);
}

export default function Reset() {
  const token = useResetToken();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLen = 8;
  const match = pw.length >= minLen && pw === pw2;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    setLoading(true);
    setError(null);

    try {
      await resetPassword({ token, password: pw });
      setDone(true);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = (err.response?.data as { error?: string } | undefined)?.error;
        setError(message ?? "No se pudo actualizar la contraseña. Inténtalo nuevamente.");
      } else {
        setError("Ocurrió un error inesperado. Inténtalo nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <section className={styles.screen} aria-label="Crear nueva contraseña">
        {/* Fondo por capas */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.clouds}`} />
        </div>

        <div className={styles.card}>
          {!done ? (
            <>
              <h1 className={styles.title}>Crea una nueva contraseña</h1>
              {!token && (
                <p className={styles.warn}>
                  Falta el <b>token</b> de recuperación. Abre esta página desde el enlace del correo.
                </p>
              )}

              <form onSubmit={onSubmit} className={styles.form}>
                <label className={styles.inputWrap}>
                  <input
                    type={show1 ? "text" : "password"}
                    placeholder="Contraseña"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    minLength={minLen}
                    className={styles.input}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShow1((v) => !v)}
                    aria-label={show1 ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {show1 ? "🙈" : "👁️"}
                  </button>
                </label>

                <label className={styles.inputWrap}>
                  <input
                    type={show2 ? "text" : "password"}
                    placeholder="Confirmar contraseña"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    required
                    minLength={minLen}
                    className={styles.input}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShow2((v) => !v)}
                    aria-label={show2 ? "Ocultar confirmación" : "Mostrar confirmación"}
                  >
                    {show2 ? "🙈" : "👁️"}
                  </button>
                </label>

                {/* Mensajes de validación */}
                <ul className={styles.hints} aria-live="polite">
                  <li className={pw.length >= minLen ? styles.ok : ""}>
                    Mínimo {minLen} caracteres
                  </li>
                  <li className={pw && pw2 && pw === pw2 ? styles.ok : ""}>
                    Ambas contraseñas coinciden
                  </li>
                </ul>

                {error && <div className={styles.error}>{error}</div>}

                <button
                  type="submit"
                  className={`${styles.pxBtn} ${styles.btnCyan}`}
                  disabled={!match || !token || loading}
                >
                  {loading ? "Actualizando..." : "Recupera tu contraseña"}
                </button>
              </form>

              <Link to="/login" className={styles.back}>← Volver al login</Link>
            </>
          ) : (
            <div className={styles.success}>
              <h2 className={styles.title}>¡Contraseña actualizada!</h2>
              <p className={styles.desc}>Ya puedes iniciar sesión con tu nueva clave.</p>
              <Link to="/login" className={`${styles.pxBtn} ${styles.btnCyan}`}>
                Ir a iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
