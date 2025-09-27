
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import styles from "./PPT-Animada.module.css";

const PPTAnimadaTemplate: React.FC = () => {
  return (
    <ActivityLayout title="Título de la presentación" backTo="/subjects">
      <div className={styles.layout}>
        <section className={styles.viewer}>
          <div>
            <strong>Coloca aquí tu recurso embebido</strong>
            <p>
              Sustituye esta sección por un iframe, un reproductor personalizado o cualquier componente que necesites para
              mostrar la presentación animada.
            </p>
          </div>
        </section>

        <aside className={styles.notes}>
          <h2>Sugerencias de uso</h2>
          <p>
            Esta plantilla está pensada para contener presentaciones interactivas. Puedes conectar botones de navegación con
            las diapositivas, registrar el progreso del estudiante o integrar notas descargables.
          </p>
          <div className={styles.toolbar}>
            <button type="button">Anterior</button>
            <button type="button">Siguiente</button>
            <button type="button">Pantalla completa</button>
          </div>
          <div className={styles.ctaRow}>
            <button type="button">Marcar como completada</button>
            <button type="button">Descargar recursos</button>
          </div>
        </aside>
      </div>
    </ActivityLayout>
  );
};

export default PPTAnimadaTemplate;
