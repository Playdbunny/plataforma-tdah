
import styles from "./Quiz.module.css";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";

const question = {
  text: "El feudalismo fue el sistema político, económico y social que predominó en:",
  options: [
    "Grecia clásica",
    "Revolución industrial",
    "Europa medieval",
    "Roma antigua"
  ],
  correct: 2 // Europa medieval
};

const HistoriaQuiz = () => {
  return (
    <ActivityLayout title={<span className={styles.quizTitle}>El Feudalismo</span>}>
      <div className={styles.quizBg}>
        <div className={styles.quizContent}>
          <div className={styles.arrowRow}>
            <span className={styles.arrowBtn}>&larr;</span>
          </div>
          <div className={styles.scrollRow}>
            <div className={styles.optionCol}>
              <button className={styles.optionBtn} type="button" tabIndex={0} aria-label={question.options[0]}>
                <img src="/Images/opciones.png" alt="opción" className={styles.optionFrame} />
                <span className={styles.optionText}>{question.options[0]}</span>
              </button>
              <button className={styles.optionBtn} type="button" tabIndex={0} aria-label={question.options[2]}>
                <img src="/Images/opciones.png" alt="opción" className={styles.optionFrame} />
                <span className={styles.optionText}>{question.options[2]}</span>
                <img src="/Images/star.png" alt="estrella" className={styles.starIcon} />
              </button>
            </div>
            <div className={styles.scrollContainer}>
              <img src="/Images/pergamino.png" alt="Pergamino" className={styles.scrollImg} />
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
            <span className={styles.footerNav}>Anterior</span>
            <span className={styles.footerPage}>Página <b>1</b> de 3</span>
            <span className={styles.footerNav}>Siguiente</span>
            <button className={styles.finishedBtn}>
              Finished <img src="/Images/coin.png" alt="Moneda" className={styles.coinIcon} /> +5
            </button>
          </div>
        </div>
      </div>
    </ActivityLayout>
  );
};

export default HistoriaQuiz;
