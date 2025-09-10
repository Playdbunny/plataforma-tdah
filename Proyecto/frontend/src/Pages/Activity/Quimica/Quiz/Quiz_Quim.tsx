import styles from "./Quiz_Quim.module.css";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import { useState } from "react";

const questions = [
  {
    text: "¿Cuál es la Primera Ley de Newton?",
    options: [
      "La ley de la inercia",
      "La ley de la gravitación universal",
      "La ley de la acción y reacción",
      "La ley de la conservación de la energía"
    ],
    correct: 0
  },
  {
    text: "¿Qué enunciado corresponde a la Segunda Ley de Newton?",
    options: [
      "F = m / a",
      "F = m · a",
      "F = m + a",
      "F = m - a"
    ],
    correct: 1
  },
  {
    text: "¿Cuál es un ejemplo de la Tercera Ley de Newton?",
    options: [
      "Un objeto en reposo permanece en reposo",
      "La fuerza de gravedad sobre un cuerpo",
      "Al empujar una pared, la pared te empuja a ti",
      "La aceleración de un auto al pisar el acelerador"
    ],
    correct: 2
  }
];

const QuimicaQuiz = () => {
  const [page, setPage] = useState(0);
  const question = questions[page];
  const totalPages = questions.length;

  const handlePrev = () => setPage((p) => (p > 0 ? p - 1 : p));
  const handleNext = () => setPage((p) => (p < totalPages - 1 ? p + 1 : p));

  return (
  <ActivityLayout title={<span className={styles.quizTitle}>Quiz de Química</span>} backTo="/subjects/quimica">
      <div className={styles.quizBg}>
        <div className={styles.quizContent}>
          <div className={styles.scrollRow}>
            <div className={styles.optionCol}>
              <button className={styles.optionBtn} type="button" tabIndex={0} aria-label={question.options[0]}>
                <img src="/Images/opciones.png" alt="opción" className={styles.optionFrame} />
                <span className={styles.optionText}>{question.options[0]}</span>
              </button>
              <button className={styles.optionBtn} type="button" tabIndex={0} aria-label={question.options[2]}>
                <img src="/Images/opciones.png" alt="opción" className={styles.optionFrame} />
                <span className={styles.optionText}>{question.options[2]}</span>
              </button>
            </div>
            <div className={styles.scrollContainer}>
              <img src="/Images/Pergamino.png" alt="Pergamino" className={styles.scrollImg} />
              <div className={styles.scrollText}>{question.text}</div>
            </div>
            <div className={styles.optionCol}>
              <button className={styles.optionBtn} type="button" tabIndex={0} aria-label={question.options[1]}>
                <img src="/Images/opciones.png" alt="opción" className={styles.optionFrame} />
                <span className={styles.optionText}>{question.options[1]}</span>
              </button>
              <button className={styles.optionBtn} type="button" tabIndex={0} aria-label={question.options[3]}>
                <img src="/Images/opciones.png" alt="opción" className={styles.optionFrame} />
                <span className={styles.optionText}>{question.options[3]}</span>
              </button>
            </div>
          </div>
          <div className={styles.quizFooter}>
            <button
              className={styles.footerNav}
              onClick={handlePrev}
              disabled={page === 0}
              aria-disabled={page === 0 ? "true" : "false"}
              type="button"
            >
              Anterior
            </button>
            <span className={styles.footerPage}>Página <b>{page + 1}</b> de {totalPages}</span>
            <button
              className={styles.footerNav}
              onClick={handleNext}
              disabled={page === totalPages - 1}
              aria-disabled={page === totalPages - 1 ? "true" : "false"}
              type="button"
            >
              Siguiente
            </button>
            <button
              className={styles.finishedBtn}
              type="button"
              onClick={() => alert('¡Actividad finalizada!')}
            >
              Finished <img src="/Images/coin.png" alt="Moneda" className={styles.coinIcon} /> +5
            </button>
          </div>
        </div>
      </div>
    </ActivityLayout>
  );
};

export default QuimicaQuiz;
