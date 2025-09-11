import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./Login.module.css";
import { useAuthStore } from "../../stores/authStore";

export default function Login() {

  /* Bloquea el scroll del body mientras esta pantalla está activa */
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  /* Estado local de los inputs */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  /* Store de auth: login (acción), loading y error */
  const { login, loading, error } = useAuthStore();

  /* Navegación y lectura de query (?next=/ruta) para redirigir tras login */
  const navigate = useNavigate();
  const [qs] = useSearchParams();
  const next = qs.get("next") || "/profile";

  /* Handler del botón Google: redirige al backend */
  const handleGoogle = () => {
    // en login no pasamos tdahType
    window.location.href = "/auth/google";
  };

  /* Submit del formulario: llama al backend usando el store */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password }); // guarda {token,user} y setea Authorization en axios

      // accedemos al user recién guardado en el store
      const user = useAuthStore.getState().user;

      // si viene ?next= lo respetamos, si no, mandamos según el rol
      const target =
      qs.get("next") || (user?.role === "admin" ? "/admin" : "/profile");

      navigate(target, { replace: true }); // redirige a la ruta que venía en ?next o al home
    } catch {
      // El mensaje ya queda en `error` del store; aquí no hace falta más
    }
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
          {/* Botón Google: delega el flujo al backend */}
          <button
            className={styles.googleBtn}
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            aria-disabled={loading}
          >
            <img src="/Images/google.png" alt="" aria-hidden className={styles.gIcon} />
            Google
          </button>

          <div className={styles.divider}><span>o</span></div>

          {/* Formulario de credenciales */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.inputWrap}>
              <input
                type="email"
                placeholder="Correo"
                required
                className={styles.input}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                aria-disabled={loading}
              />
            </label>

            <label className={styles.inputWrap}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Contraseña"
                required
                className={styles.input}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPw((v) => !v)}
                disabled={loading}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </label>

            {/* Mensaje de error del store (por ej.: 401) */}
            {error && <p className={styles.error} role="alert">{error}</p>}

            <button
              type="submit"
              className={`${styles.pxBtn} ${styles.btnCyan}`}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Iniciando..." : "¡Continúa tu aventura!"}
            </button>
          </form>

          <Link to="/forgot" className={styles.forgot}>¿Olvidaste tu contraseña?</Link>
        </div>
      </section>
    </>
  );
}