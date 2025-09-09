
import styles from "./Quiz.module.css";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import { useState } from "react";

const questions = [
  {
    text: "El feudalismo fue el sistema político, económico y social que predominó en:",
    options: [
      "Grecia clásica",
      "Revolución industrial",
      "Europa medieval",
      "Roma antigua"
    ],
    correct: 2
  },
  {
    text: "¿Cuál fue la principal actividad económica durante la Edad Media?",
    options: [
      "Comercio marítimo",
      "Agricultura",
      "Minería",
      "Industria textil"
    ],
    correct: 1
  },
  {
    text: "¿Qué institución tenía mayor poder en la Europa medieval?",
    options: [
      "La Iglesia",
      "El Parlamento",
      "Los gremios",
      "La Monarquía"
    ],
    correct: 0
  }
];

const HistoriaQuiz = () => {
  const [page, setPage] = useState(0);
  const question = questions[page];
  const totalPages = questions.length;

  const handlePrev = () => setPage((p) => (p > 0 ? p - 1 : p));
  const handleNext = () => setPage((p) => (p < totalPages - 1 ? p + 1 : p));

  return (
    <ActivityLayout title={<span className={styles.quizTitle}>El Feudalismo</span>}>
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

export default HistoriaQuiz;
