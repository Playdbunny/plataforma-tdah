import { Link } from "react-router-dom";
import styles from "./Login.module.css";

export default function Login() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    console.log("Login:", data); // <-- aquí luego harás fetch/axios al backend
    // TODO: si login OK => navigate("/dashboard")
  };

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        {/* Columna izquierda: formulario */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.titleLeft}>Iniciar sesión</h2>

          <input
            className={styles.input}
            name="identifier"
            placeholder="Usuario o Correo"
            autoComplete="username"
            required
          />

          <input
            className={styles.input}
            type="password"
            name="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            required
          />

          <button className={styles.submit} type="submit">Iniciar sesión</button>

          <p className={styles.alt}>
            ¿No tienes cuenta? <Link to="/register" className={styles.linkish}>Crear cuenta</Link>
          </p>
        </form>

        {/* Columna derecha: mensaje */}
        <div className={styles.right}>
          <h2 className={styles.titleRight}>¡Bienvenido otra vez!</h2>
          <p className={styles.text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse eros ipsum,
            dignissim et metus ut, cursus porttitor velit.
          </p>
          <div className={styles.avatarHole} />
        </div>
      </section>
    </main>
  );
}
