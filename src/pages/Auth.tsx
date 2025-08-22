// src/pages/Auth.tsx
import React, { useState } from "react";
import styles from "./Auth.module.css";
import { useAppStore } from "../stores/appStore";

export default function Auth() {
  const tdahType = useAppStore((s) => s.tdahType); // si no hay, muestra "—"
  const [loginForm, setLoginForm] = useState({ user: "", pass: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", pass: "", course: "" });
  const [shakeLogin, setShakeLogin] = useState(false);
  const [shakeReg, setShakeReg] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.user || !loginForm.pass) {
      setShakeLogin(true);
      setTimeout(() => setShakeLogin(false), 600);
      return;
    }
    console.log("login", loginForm);
    // TODO: integrar backend (supabase / api)
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.pass) {
      setShakeReg(true);
      setTimeout(() => setShakeReg(false), 600);
      return;
    }
    console.log("register", { ...regForm, tdah: tdahType ?? "—" });
    // “confeti” simpático
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1800);
    // TODO: integrar backend (supabase / api)
  };

  return (
    <div className={styles.screen}>
      {/* decoraciones animadas */}
      <div className={`${styles.float} ${styles.cloud} ${styles.c1}`} />
      <div className={`${styles.float} ${styles.cloud} ${styles.c2}`} />
      <div className={`${styles.float} ${styles.coin} ${styles.k1}`}>🪙</div>
      <div className={`${styles.float} ${styles.coin} ${styles.k2}`}>🪙</div>

      {celebrate && (
        <div className={styles.confetti}>
          <span>🎉</span><span>✨</span><span>🎉</span><span>✨</span><span>🎉</span>
        </div>
      )}

      <header className={styles.topbar}>
        <a className={styles.brand} href="/">###</a>
        <nav className={styles.menu}>
          <a href="/">Inicio</a>
          <a href="/progress">Mi progreso</a>
          <a href="/subjects">Materias</a>
          <a href="/resources">Recursos</a>
        </nav>
      </header>

      <main className={styles.board}>
        {/* Login */}
        <section className={`${styles.panel} ${styles.left} ${shakeLogin ? styles.shake : ""}`}>
          <h2 className={styles.h2}>¡Bienvenido otra vez!</h2>
          <p className={styles.copy}>¡Sigue tu aventura! Retoma desde donde lo dejaste.</p>

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="text"
                placeholder="Usuario o Correo"
                value={loginForm.user}
                onChange={(e) => setLoginForm({ ...loginForm, user: e.target.value })}
                required
              />
            </div>

            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="password"
                placeholder="Contraseña"
                value={loginForm.pass}
                onChange={(e) => setLoginForm({ ...loginForm, pass: e.target.value })}
                required
              />
            </div>

            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
              Iniciar sesión
            </button>
          </form>
        </section>

        <div className={styles.divider} />

        {/* Registro */}
        <section className={`${styles.panel} ${styles.right} ${shakeReg ? styles.shake : ""}`}>
          <h2 className={styles.h2}>¡Únete!</h2>
          <p className={styles.copy}>Crea tu perfil y desbloquea recursos adaptados a tu forma de aprender.</p>

          {/* Etiqueta TDAH elegida */}
          <div className={styles.tagRow}>
            <span className={styles.badge}>Tipo TDAH: {tdahType ?? "—"}</span>
          </div>

          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="text"
                placeholder="Nombre Apellido"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                required
              />
            </div>

            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="email"
                placeholder="Correo"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                required
              />
            </div>

            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="password"
                placeholder="Contraseña"
                value={regForm.pass}
                onChange={(e) => setRegForm({ ...regForm, pass: e.target.value })}
                required
              />
            </div>

            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="text"
                placeholder="Curso"
                value={regForm.course}
                onChange={(e) => setRegForm({ ...regForm, course: e.target.value })}
              />
            </div>

            <button className={`${styles.btn} ${styles.btnSuccess}`} type="submit">
              Registrar
            </button>

            <small className={styles.hint}>
              Tip: tu tipo TDAH quedó seleccionado al elegirlo en la pantalla anterior.
            </small>
          </form>
        </section>
      </main>
    </div>
  );
}
