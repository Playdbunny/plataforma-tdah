import styles from './Quiz_Mat.module.css';
import { useRef, useState } from 'react';
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";

const questions = [
  {
    text: "¿Cuál es el resultado de 2x + 5x?",
    options: [
      "2x^5",
      "7x",
      "10x",
      "x^7"
    ],
    correct: 1
  },
  {
    text: "¿Cómo se resuelve la ecuación x + 3 = 10?",
    options: [
      "x = 7",
      "x = 13",
      "x = -7",
      "x = 3"
    ],
    correct: 0
  },
  {
    text: "¿Cuál es el valor de x en la ecuación 4x = 20?",
    options: [
      "x = 5",
      "x = 24",
      "x = 16",
      "x = 80"
    ],
    correct: 0
  }
];

function MatematicaQuiz() {
  const [page, setPage] = useState(0);
  const question = questions[page];
  const totalPages = questions.length;

  const handlePrev = () => setPage((p) => (p > 0 ? p - 1 : p));
  const handleNext = () => setPage((p) => (p < totalPages - 1 ? p + 1 : p));

  return (
  <ActivityLayout title={<span className={styles.quizTitle}>Algebra basica</span>} backTo="/subjects/matematicas">
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
              aria-disabled={page === 0}
              type="button"
            >
              Anterior
            </button>
            <span className={styles.footerPage}>Página <b>{page + 1}</b> de {totalPages}</span>
            <button
              className={styles.footerNav}
              onClick={handleNext}
              disabled={page === totalPages - 1}
              aria-disabled={page === totalPages - 1}
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
}

export default MatematicaQuiz;