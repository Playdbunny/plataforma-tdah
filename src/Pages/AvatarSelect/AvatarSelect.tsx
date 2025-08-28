// ─────────────────────────────────────────────────────────────
// AvatarSelect.tsx
// Pantalla posterior al registro para elegir:
//   • Un avatar (pixel art) de una lista.
//   • Un nombre de usuario válido.
// Reutiliza el patrón del Login: Navbar, fondo por capas, tarjeta centrada.
// Atajos de teclado: ← / → para cambiar avatar, Enter para continuar.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import styles from "./AvatarSelect.module.css";
import { useNavigate } from "react-router-dom";

export default function AvatarSelect() {
  // 🔹 Bloquea el scroll igual que en Login
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  // 🔹 Catálogo de avatares (coloca los PNG en /public/avatars/)
  const AVATARS = [
    { id: "boy",    src: "/public/Gifs/boy.gif"},
    { id: "girl",  src: "/public/Gifs/girl.gif"},
    { id: "foxboy",  src: "/public/Gifs/foxboy.gif"},
    { id: "foxgirl",   src: "/public/Gifs/foxgirl.gif"},
    { id: "robot",   src: "/public/Gifs/robot.gif"},
  ];

  // 🔹 Estado: índice del avatar seleccionado y nombre de usuario
  const [index, setIndex] = useState(0);
  const [username, setUsername] = useState("");

  // 🔹 Validación simple del nombre (puedes endurecer reglas a gusto)
  const error = useMemo(() => {
    const s = username.trim();
    if (s.length < 3) return "Mínimo 3 caracteres.";
    if (s.length > 16) return "Máximo 16 caracteres.";
    if (!/^[a-zA-Z0-9_-]+$/.test(s)) return "Solo letras, números, guion y guion_bajo.";
    return "";
  }, [username]);

  // 🔹 Navegación al finalizar (simula guardar en backend)
  const navigate = useNavigate();
  const handleContinue = () => {
    if (error) return; // seguridad
    // TODO: guarda en tu backend/estado global:
    //   avatar: AVATARS[index].id
    //   username: username.trim()
    // Luego envía al usuario donde quieras (p. ej. /courses)
    navigate("/courses");
  };

  // 🔹 Atajos de teclado para cambiar avatar y confirmar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  setIndex((i) => (i - 1 + AVATARS.length) % AVATARS.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % AVATARS.length);
      if (e.key === "Enter" && !error) handleContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [error]); // depende del estado de error

  // 🔹 Helpers para los botones flecha
  const prev = () => setIndex((i) => (i - 1 + AVATARS.length) % AVATARS.length);
  const next = () => setIndex((i) => (i + 1) % AVATARS.length);

  // 🔹 Avatar actual
  const current = AVATARS[index];

  return (
    <>
      {/* ✅ Navbar solo con la marca (como en Login) */}
      <Navbar />

      {/* 🌌 Pantalla con fondo en capas (mismo patrón del Login) */}
      <section className={styles.screen} aria-label="Elegir avatar y nombre de usuario">
        <div className={styles.bg} aria-hidden>
          <div className={`${styles.layer} ${styles.sky}`} />
          <div className={`${styles.layer} ${styles.clouds}`} />
        </div>

        {/* 🧩 Tarjeta central con los controles */}
        <div className={styles.card} role="dialog" aria-labelledby="av-title" aria-describedby="av-desc">
          {/* Selector de avatar con flechas */}
          <div className={styles.avatarRow}>
            <button className={styles.arrow} onClick={prev} aria-label="Avatar anterior">‹</button>

            <div className={styles.avatarBox} aria-live="polite">
              {/* Imagen del avatar (usa image-rendering: pixelated) */}
              <img src={current.src} className={styles.avatarImg} />
              {/* Etiqueta del avatar elegido */}
            </div>

            <button className={styles.arrow} onClick={next} aria-label="Siguiente avatar">›</button>
          </div>

          {/* Indicadores (dots) del carrusel */}
          <div className={styles.dots} aria-hidden="true">
            {AVATARS.map((_, i) => (
              <span key={i} className={`${styles.dot} ${i === index ? styles.dotActive : ""}`} />
            ))}
          </div>

          {/* Títulos / instrucciones */}
          <h2 id="av-title" className={styles.title}>Elige tu personaje</h2>
          <p id="av-desc" className={styles.desc}>También podrás cambiarlo luego desde tu perfil.</p>

          {/* Input de nombre de usuario */}
            <div className={styles.field}>
            {/* Input */}
            <input
                id="username"
                className={`${styles.input} ${error ? styles.inputError : ""}`}
                placeholder="Nombre_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                autoComplete="off"
                aria-describedby="username-help"
            />

            {/* Helper PERSISTENTE (reserva altura) */}
            <p
                id="username-help"
                className={`${styles.helper} ${error ? styles.helperError : styles.helperOk}`}
                // aria-live="polite" anuncia el cambio de estado sin reordenar el layout
                aria-live="polite"
            >
                {error ? "Mínimo 3 caracteres." : "Nombre válido"}
            </p>
            </div>

            {/* Botón principal (siempre mantiene su margen superior) */}
            <button
            className={`${styles.pxBtn} ${styles.btnCyan}`}
            onClick={handleContinue}
            disabled={!!error}
            >
            Ingresar
         </button>
        </div>
      </section>
    </>
  );
}
