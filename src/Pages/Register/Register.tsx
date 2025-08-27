// ===== Registro de usuario con estilo pixel, fondo por capas y lectura del TDAH desde el store =====

import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";     // Zustand con persist
import styles from "./Register.module.css";

export default function Register() {
  // 1) Leemos el tipo de TDAH que eligió el usuario en /tdah.
  //    Como tu store usa `persist`, este valor se rehidrata solo al recargar la app.
  const tdahType = useAppStore((s) => s.tdahType); // "inatento" | "hiperactivo" | "combinado" | null

  // 2) Estado local del formulario (controlado)
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [pw2, setPw2]     = useState("");

  // 3) Mostrar/ocultar contraseñas (solo UI)
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  // 4) Loading para deshabilitar el botón mientras “envía”
  const [loading, setLoading] = useState(false);

  // 5) Reglas de validación básicas
  const minLen = 8;
  const valid =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    pw.length >= minLen &&
    pw === pw2 &&
    !!tdahType; // Debe existir un TDAH elegido

  // 6) Handler de submit (por ahora demo). Aquí conectarás tu API real.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);

    // TODO: Reemplázalo con tu llamada real:
    // await fetch("/auth/register", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ name, email, password: pw, tdahType }),
    // });

    await new Promise((r) => setTimeout(r, 800)); // simulación
    setLoading(false);
    alert("Registro demo — conecta tu API aquí 🤝");
  };

  // 7) Texto amigable para mostrar el TDAH en la UI
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
      {/* Navbar fijo arriba */}
      <Navbar />

      <section className={styles.screen} aria-label="Registro">
        {/* ===== FONDO EN CAPAS (reciclado del Login) ===== */}
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.clouds}`} />
        </div>

        {/* ===== CARD con el formulario ===== */}
        <div className={styles.card}>
          {/* Botón “Google” opcional (placeholder). Puedes conectar OAuth cuando quieras. */}
          <button
            type="button"
            className={styles.googleBtn}
            onClick={() => alert("Google OAuth demo")}
          >
            {/* Icono local en /public/google.svg (o quítalo si no lo tienes) */}
            <img src="/google.png" alt="" aria-hidden className={styles.gIcon} />
            Google
          </button>

          {/* Separador “o” */}
          <div className={styles.divider}><span>o</span></div>

          {/* ===== FORMULARIO ===== */}
          <form onSubmit={onSubmit} className={styles.form}>
            {/* Nombre */}
            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>

            {/* Correo */}
            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            {/* Contraseña */}
            <label className={styles.inputWrap}>
              <input
                className={styles.input}
                type={show1 ? "text" : "password"}       // alterna mostrar/ocultar
                placeholder="Contraseña"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                minLength={minLen}
                autoComplete="new-password"
              />
              {/* Botón “ojo” para ver/ocultar */}
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShow1((v) => !v)}
                aria-label={show1 ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {show1 ? "🙈" : "👁️"}
              </button>
            </label>

            {/* Confirmar contraseña */}
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

            {/* TDAH: campo readonly + link para elegir/cambiar en /tdah */}
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

            {/* Pistas visuales de validación */}
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

            {/* CTA */}
            <button
              type="submit"
              className={`${styles.pxBtn} ${styles.btnCyan}`}
              disabled={!valid || loading}
            >
              {loading ? "Creando..." : "Inicia tu aventura!"}
            </button>
          </form>

          {/* Nota legal (placeholder) */}
          <p className={styles.terms}>
            Al iniciar, se aceptan <a href="#t">Términos y Condiciones</a>.
          </p>
        </div>
      </section>
    </>
  );
}
