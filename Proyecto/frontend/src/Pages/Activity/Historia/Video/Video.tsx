import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import styles from "./Video.module.css";

const VideoTemplate = () => {
  return (
    <ActivityLayout title="Título del video" backTo="/subjects">
      <div className={styles.wrapper}>
        <div className={styles.player}>
          <div className={styles.playerPlaceholder}>
            <strong>Inserta tu reproductor aquí</strong>
            <p>
              Sustituye este contenedor por la etiqueta <code>&lt;video&gt;</code>, un embed externo o cualquier componente
              que utilices para transmitir el material audiovisual.
            </p>
          </div>
        </div>

        <section className={styles.details}>
          <h2>Contexto e instrucciones</h2>
          <p>
            Usa esta área para describir los objetivos de aprendizaje, entregar guías de trabajo o compartir enlaces
            complementarios. Puedes agregar botones extra para descargar recursos, iniciar evaluaciones o marcar la actividad
            como completada.
          </p>
          <div className={styles.actionRow}>
            <button type="button" className={styles.highlight}>
              Marcar como vista
            </button>
            <button type="button">Abrir guía de trabajo</button>
            <button type="button">Compartir</button>
          </div>
        </section>
      </div>
    </ActivityLayout>
  );
};

export default VideoTemplate;
