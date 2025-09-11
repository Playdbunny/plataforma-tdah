// ===== Registro real con authStore: envía a /auth/register y pasa tdahType =====
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./Register.module.css";

// Store donde guardas el TDAH elegido en la pantalla anterior
import { useAppStore } from "../../stores/appStore";

// Store de autenticación (axios + persist + token)
import { useAuthStore } from "../../stores/authStore";
import type { TDAHType } from "../../types/user";

export default function Register() {
  /* Bloquea el scroll */
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  // 1) TDAH elegido en /tdah (persistido en appStore)
  const tdahType = useAppStore((s) => s.tdahType) as TDAHType;

  // 2) Acciones de auth
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();

  // 3) Estado local del formulario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // 4) Mostrar/ocultar contraseñas
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  // 5) Validación básica
  const minLen = 8;
  const valid =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    pw.length >= minLen &&
    pw === pw2 &&
    !!tdahType; // Debe existir TDAH elegido

  // 6) Submit real: llama a /auth/register vía authStore y redirige
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;

    await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: pw,
      confirmPassword: pw2,
      tdahType, // ← se guarda en el backend
    });

    // Tras crear la cuenta, manda al onboarding de perfil
    navigate("/profile/edit", { replace: true });
  };

  // 7) Google: si ya hay TDAH, lo enviamos en la query (viaja en state)
  const handleGoogle = () => {
    if (!tdahType) {
      // si no eligió TDAH, invítalo a elegirlo primero
      navigate("/tdah");
      return;
    }
    const p = new URLSearchParams({ tdahType });
    window.location.href = `/auth/google?${p.toString()}`;
  };

  // Texto amigable del TDAH
  const labelTdah =
    tdahType === "inatento"
      ? "Inatento"
      : tdahType === "hiperactivo"
      ? "Hiperactivo"
      : tdahType === "combinado"
      ? "Combinado"
      : "";

  return (
    <>
      <Navbar />

      <section className={styles.screen} aria-label="Registro">
        {/* Fondo en capas */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.clouds}`} />
        </div>

        {/* Card */}
        <div className={styles.card}>
          {/* Botón Google (flujo OAuth) */}
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={loading}
            aria-disabled={loading}
          >
            <img src="/Images/google.png" alt="" aria-hidden className={styles.gIcon} />
            Google
          </button>

          <div className={styles.divider}><span>o</span></div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className={styles.form}>
            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                disabled={loading}
              />
            </label>

            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </label>

            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type={show1 ? "text" : "password"}
                placeholder="Contraseña"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                minLength={minLen}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShow1((v) => !v)}
                aria-label={show1 ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {show1 ? "🙈" : "👁️"}
              </button>
            </label>

            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type={show2 ? "text" : "password"}
                placeholder="Confirmar contraseña"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                minLength={minLen}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShow2((v) => !v)}
                aria-label={show2 ? "Ocultar confirmación" : "Mostrar confirmación"}
                disabled={loading}
              >
                {show2 ? "🙈" : "👁️"}
              </button>
            </label>

            {/* TDAH: readonly + link para elegir/cambiar */}
            <div className={styles.tdahRow}>
              <input
                className={`${styles.input} ${styles.inputReadonly}`}
                value={tdahType ? `Tipo de TDAH: ${labelTdah}` : "Tipo de TDAH"}
                readOnly
              />
              {!tdahType ? (
                <Link to="/tdah" className={styles.pickLink}>Elegir</Link>
              ) : (
                <Link to="/tdah" className={styles.pickLink}>Cambiar</Link>
              )}
            </div>

            {/* Pistas de validación */}
            <ul className={styles.hints} aria-live="polite">
              <li className={pw.length >= minLen ? styles.ok : ""}>
                Contraseña mínimo {minLen} caracteres
              </li>
              <li className={pw && pw2 && pw === pw2 ? styles.ok : ""}>
                Las contraseñas coinciden
              </li>
              <li className={tdahType ? styles.ok : ""}>
                Tipo de TDAH seleccionado
              </li>
            </ul>

            {/* Error del backend (Zod/409/etc.) */}
            {error && <p className={styles.error} role="alert">{error}</p>}

            {/* CTA */}
            <button
              type="submit"
              className={`${styles.pxBtn} ${styles.btnCyan}`}
              disabled={!valid || loading}
              aria-busy={loading}
            >
              {loading ? "Creando..." : "¡Inicia tu aventura!"}
            </button>
          </form>

          <p className={styles.terms}>
            Al iniciar, se aceptan <a href="#t">Términos y Condiciones</a>.
          </p>
        </div>
      </section>
    </>
  );
}
