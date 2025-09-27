import ActivityLayoutInfografia from "../../../../Layouts/ActivityLayout/ActivityLayoutInfografia";
import styles from "./Infografia.module.css";

const TEMPLATE_QUESTIONS = [
  {
    id: "q1",
    question: "Describe aquí la primera pregunta clave de la infografía.",
    hint: "Añade una pista breve o un dato extra que complemente la imagen.",
    options: ["Opción A", "Opción B", "Opción C"],
  },
  {
    id: "q2",
    question: "Utiliza este espacio para reforzar un concepto importante.",
    hint: "Puedes vincular esta pista a un elemento visual específico.",
    options: ["Respuesta 1", "Respuesta 2", "Respuesta 3"],
  },
  {
    id: "q3",
    question: "Cierra la actividad con una reflexión o pregunta de repaso.",
    hint: "Invita a los estudiantes a observar detalles secundarios.",
    options: ["Ejemplo 1", "Ejemplo 2", "Ejemplo 3"],
  },
];

const HistoriaInfografiaTemplate = () => {
  return (
    <ActivityLayoutInfografia title="Título de la infografía" backTo="/subjects">
      <div className={styles.wrapper}>
        <section className={styles.preview}>
          <div>
            <strong>Espacio para tu recurso visual</strong>
            <p>
              Inserta la ilustración, GIF o presentación estática que acompañará a la actividad.
              Puedes reemplazar esta caja por un componente personalizado.
            </p>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <h2 className={styles.sectionTitle}>Preguntas sugeridas</h2>
          <ol className={styles.questionList}>
            {TEMPLATE_QUESTIONS.map((question) => (
              <li key={question.id} className={styles.questionItem}>
                <strong>{question.question}</strong>
                <span className={styles.hint}>{question.hint}</span>
                <ul className={styles.optionList}>
                  {question.options.map((option, index) => (
                    <li key={index} className={styles.optionItem}>
                      {option}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className={styles.helperText}>
            Copia este archivo cuando necesites crear una nueva infografía y reemplaza el contenido por los datos de tu materia.
            También puedes añadir controles adicionales como zoom, descargas o enlaces externos según tus requerimientos.
          </p>
        </aside>
      </div>
    </ActivityLayoutInfografia>
  );
};

export default HistoriaInfografiaTemplate;

