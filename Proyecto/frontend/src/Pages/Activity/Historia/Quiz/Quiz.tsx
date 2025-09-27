
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import styles from "./Quiz.module.css";

const QUIZ_TEMPLATE = {
  title: "Título del quiz",
  description:
    "Personaliza esta plantilla con la temática de tu materia. Puedes reemplazar el texto por instrucciones específicas o añadir elementos multimedia.",
  question: "Redacta aquí la pregunta o desafío principal del quiz.",
  options: ["Respuesta A", "Respuesta B", "Respuesta C", "Respuesta D"],
};

const HistoriaQuizTemplate = () => {
  return (
    <ActivityLayout title={QUIZ_TEMPLATE.title} backTo="/subjects">
      <div className={styles.container}>
        <p className={styles.instructions}>
          <strong>¿Cómo usar esta plantilla?</strong>
          {" "}
          {QUIZ_TEMPLATE.description}
          {" "}
          Duplica el archivo y reemplaza el contenido con tus preguntas reales. Si tu quiz necesita varias pantallas, puedes
          controlar el estado con hooks o integrarlo con un gestor de formularios.
        </p>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <label>Pregunta 1</label>
            <h2>{QUIZ_TEMPLATE.question}</h2>
          </header>

          <div className={styles.options}>
            {QUIZ_TEMPLATE.options.map((option, index) => (
              <button key={option} type="button" className={styles.optionButton}>
                <span className={styles.badge}>{String.fromCharCode(65 + index)}</span>
                {option}
              </button>
            ))}
          </div>

          <footer className={styles.footer}>
            <span className={styles.progress}>Página 1 de n</span>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.navButton}>
                Anterior
              </button>
              <button type="button" className={styles.navButton}>
                Siguiente
              </button>
              <button type="button" className={styles.finishButton}>
                Finalizar
              </button>
            </div>
          </footer>
        </section>
      </div>
    </ActivityLayout>
  );
};

export default HistoriaQuizTemplate;
