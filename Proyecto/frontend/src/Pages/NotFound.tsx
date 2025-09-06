import React from "react";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <div className={styles.notfoundContainer}>
      <h1 className={styles.notfoundTitle}>404</h1>
      <h2 className={styles.notfoundSubtitle}>Página no encontrada</h2>
      <p>La ruta que buscas no existe o fue movida.</p>
      <a href="/" className={styles.notfoundLink}>Volver al inicio</a>
    </div>
  );
}
